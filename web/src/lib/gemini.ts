import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai'
import OpenAI from 'openai'
import { withTimeout } from './timeout'

// Hard ceiling for a single LLM round-trip so a stalled provider can't hold the
// serverless function open until the platform force-kills it (routes set
// maxDuration=60).
const LLM_TIMEOUT_MS = 45_000

// Lazily construct the Gemini client so a missing key surfaces as a clear error
// at call time rather than an opaque failure at module import.
let _genAI: GoogleGenerativeAI | null = null
function genAI(): GoogleGenerativeAI {
  if (!_genAI) {
    const key = process.env.GEMINI_API_KEY
    if (!key) throw new Error('GEMINI_API_KEY is not set')
    _genAI = new GoogleGenerativeAI(key)
  }
  return _genAI
}

// Gemini model slug. `gemini-flash-latest` is an alias Google keeps pointed at
// the current stable Flash model — pinned slugs like `gemini-2.5-flash` get cut
// off for new API keys ("no longer available to new users"). Override via env.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest'

// OpenRouter (OpenAI-compatible) — used for outfit composition when a key is set.
// Swap the LLM by changing OPENROUTER_MODEL (any slug from openrouter.ai/models).
let _openrouter: OpenAI | null = null
function openrouter(): OpenAI {
  if (!_openrouter) {
    _openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': 'https://stylesync-murex.vercel.app',
        'X-Title': 'StyleSync',
      },
    })
  }
  return _openrouter
}

// Pull a JSON object out of a model reply (handles ```json fences / stray prose).
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('LLM did not return JSON')
  return body.slice(start, end + 1)
}

// Structured output schema — Gemini will return JSON matching this exactly
const attributeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    is_clothing: { type: SchemaType.BOOLEAN },
    reject_reason: { type: SchemaType.STRING },
    category: { type: SchemaType.STRING },
    subcategory: { type: SchemaType.STRING },
    colors: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    pattern: { type: SchemaType.STRING },
    fabric: { type: SchemaType.STRING },
    fit: { type: SchemaType.STRING },
    sleeve_length: { type: SchemaType.STRING },
    neck_type: { type: SchemaType.STRING },
    occasions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    seasons: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    features: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    description: { type: SchemaType.STRING },
  },
  required: ['is_clothing', 'category', 'colors', 'occasions', 'seasons', 'description'],
} as Schema
const SYSTEM = `You are a fashion analyst. You are shown ONE image a user uploaded to add to their wardrobe. First decide whether it is actually a wearable clothing item or accessory, then return structured attributes.

is_clothing:
- true  — the image clearly shows a single wearable garment/footwear/accessory (a shirt, dress, kurta, jeans, shoes, bag, jewellery, etc.), whether laid flat, on a hanger, or worn by a person. Judge by the GARMENT, not whether a body is present.
- false — the main subject is NOT wearable clothing: e.g. a face/selfie with no clear garment, a person where no single garment is identifiable, an animal, food, furniture, a gadget, a screenshot, scenery, or an image too blurry/dark to identify a garment. When false, put a short, friendly reason in reject_reason (e.g. "This looks like a selfie — try a photo of a single clothing item") and you may leave the other fields empty.
When genuinely unsure but a garment is plausibly present, prefer is_clothing=true — don't block real clothes.

If is_clothing is true, focus ONLY on the single main garment (ignore the background, the body, and any secondary items) and fill these using the vocabularies (pick from the list, or leave empty if uncertain):
- category: top | bottom | dress | outerwear | footwear | accessory | ethnic
- pattern: solid | striped | checked | floral | graphic | printed | textured | other
- fit: slim | regular | loose | oversized | tailored
- sleeve_length: short | long | three_quarter | sleeveless | strap | n/a
- occasions: casual | work | party | formal | gym | travel | ethnic | date | beach | loungewear
- seasons: summer | winter | monsoon | all-season

For ethnic Indian wear (kurta, saree, lehenga, sherwani, etc.), use category="ethnic" and put the specific name in subcategory.
Colors: plain names (navy blue, beige, off-white, etc.), max 3, describing the GARMENT not skin or background.
Description: one short sentence describing the item.`

export interface ItemAttributes {
  is_clothing: boolean
  reject_reason?: string
  category: string
  subcategory?: string
  colors: string[]
  pattern?: string
  fabric?: string
  fit?: string
  sleeve_length?: string
  neck_type?: string
  occasions: string[]
  seasons: string[]
  features?: string[]
  description: string
}

export async function extractAttributes(pngBuffer: Buffer): Promise<ItemAttributes> {
  // Run tagging through OpenRouter when configured, falling back to Gemini on
  // any failure so adding items can never fully break.
  if (process.env.OPENROUTER_API_KEY) {
    try {
      return await extractViaOpenRouter(pngBuffer)
    } catch (err) {
      console.error(
        '[tagging] OpenRouter failed, falling back to Gemini:',
        err instanceof Error ? err.message : err,
      )
    }
  }
  return extractViaGemini(pngBuffer)
}

async function extractViaGemini(pngBuffer: Buffer): Promise<ItemAttributes> {
  const model = genAI().getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: attributeSchema,
      temperature: 0.2,
    },
    systemInstruction: SYSTEM,
  })
  const result = await withTimeout(
    model.generateContent([
      { inlineData: { mimeType: 'image/png', data: pngBuffer.toString('base64') } },
      { text: 'Extract the attributes of this clothing item.' },
    ]),
    LLM_TIMEOUT_MS,
    'Gemini tagging',
  )
  const a = parseJsonOrThrow<ItemAttributes>(result.response.text(), 'tagging')
  // Default to accepting: a missing flag must never block a real upload.
  a.is_clothing = a.is_clothing !== false
  return a
}

// Structured output is usually well-formed, but never assume — parse
// defensively so a stray token can't throw an unhandled SyntaxError.
function parseJsonOrThrow<T>(text: string, label: string): T {
  try {
    return JSON.parse(text) as T
  } catch {
    try {
      return JSON.parse(extractJson(text)) as T
    } catch {
      throw new Error(`Could not parse ${label} response as JSON`)
    }
  }
}

// Vision tagging via OpenRouter. Needs a multimodal model — defaults to
// OPENROUTER_VISION_MODEL, else OPENROUTER_MODEL, else Gemini Flash.
async function extractViaOpenRouter(pngBuffer: Buffer): Promise<ItemAttributes> {
  const model =
    process.env.OPENROUTER_VISION_MODEL ||
    process.env.OPENROUTER_MODEL ||
    'google/gemini-2.5-flash'
  const dataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`
  const system = `${SYSTEM}

Return ONLY a valid JSON object with these keys: is_clothing (boolean), reject_reason (string, only when is_clothing is false), category, subcategory, colors (array of strings), pattern, fabric, fit, sleeve_length, neck_type, occasions (array), seasons (array), features (array), description. No markdown, no prose.`

  const res = await openrouter().chat.completions.create(
    {
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the attributes of this clothing item.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    },
    { timeout: LLM_TIMEOUT_MS },
  )
  const text = res.choices[0]?.message?.content ?? ''
  const p = JSON.parse(extractJson(text)) as Partial<ItemAttributes>
  // Normalise so the shape is always valid regardless of the model.
  return {
    // Default to accepting: a missing flag must never block a real upload.
    is_clothing: p.is_clothing !== false,
    reject_reason: p.reject_reason,
    category: p.category ?? 'other',
    subcategory: p.subcategory,
    colors: p.colors ?? [],
    pattern: p.pattern,
    fabric: p.fabric,
    fit: p.fit,
    sleeve_length: p.sleeve_length,
    neck_type: p.neck_type,
    occasions: p.occasions ?? [],
    seasons: p.seasons ?? [],
    features: p.features ?? [],
    description: p.description ?? '',
  }
}

// --- Generative garment extraction ("nano banana") ---------------------------
// Instead of masking pixels (SegFormer/rembg), regenerate the garment as a clean
// e-commerce product photo. Prompt tuned with the mentor for consistency: flat,
// straight front-facing, no mannequin/body, pure-white background, and no
// invented labels. Routed through OpenRouter (its key has image credits; the
// free Gemini key 429s on image models). ~$0.04/image.
const PRODUCT_IMAGE_MODEL =
  process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image'

const PRODUCT_PROMPT = `Turn this into a clean e-commerce product photo of ONLY the main garment.
Strict requirements:
- Show the garment FLAT and perfectly FRONT-FACING (straight-on front view), neatly laid out.
- Do NOT show any mannequin, hanger, person, body, skin, arms, legs, or head.
- Pure solid white (#FFFFFF) seamless background.
- Garment centred and fully visible, upright, symmetrical.
- Preserve the exact colours, print/pattern, neckline, sleeves and details faithfully.
- Do NOT add or invent any labels, brand tags, logos or text.
- Remove any secondary clothing (e.g. leggings or pants) that is not the main garment.`

/**
 * Regenerate an on-body / messy photo as a clean product shot of the garment.
 * Returns a PNG Buffer. Throws on any failure (missing key, non-2xx, no image in
 * the response) so callers can fall back to the masking cutout — a failed
 * generation must never block an upload.
 */
export async function generateProductImage(imageBuffer: Buffer): Promise<Buffer> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY is not set')

  const dataUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://stylesync-murex.vercel.app',
      'X-Title': 'StyleSync',
    },
    body: JSON.stringify({
      model: PRODUCT_IMAGE_MODEL,
      // OpenRouter extension: ask the image model to return an image (+ text).
      modalities: ['image', 'text'],
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PRODUCT_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`nano banana ${res.status}: ${detail.slice(0, 200)}`)
  }

  const j = (await res.json()) as {
    choices?: { message?: { images?: { image_url?: { url?: string }; url?: string }[] } }[]
  }
  const img = j.choices?.[0]?.message?.images?.[0]
  const url = img?.image_url?.url || img?.url
  if (typeof url !== 'string' || !url.startsWith('data:')) {
    throw new Error('nano banana returned no image')
  }
  const b64 = url.slice(url.indexOf(',') + 1)
  return Buffer.from(b64, 'base64')
}

// --- Text embeddings ---------------------------------------------------------
// We embed the tagger's TEXT description of the garment (not the image) so that
// search is text-vs-text — what embedding models are actually good at — instead
// of the old text-query-vs-CLIP-image-vector mismatch. Both the item vectors
// (write path) and the query vector (recommender) MUST use this same model AND
// dimension, or they live in different spaces and similarity is meaningless.
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001'
// gemini-embedding-001 is Matryoshka: request 768 dims to match the pgvector
// column. Cosine ranking is scale-invariant, so truncated dims need no re-norm.
const EMBED_DIMS = Number(process.env.GEMINI_EMBED_DIMS) || 768

/** Fields we turn into the embedded text. Loose on purpose so both the tagger's
 *  ItemAttributes and a raw DB row (backfill) satisfy it. */
export interface EmbedItemFields {
  description?: string | null
  category?: string | null
  subcategory?: string | null
  colors?: string[] | null
  pattern?: string | null
  fabric?: string | null
  fit?: string | null
  occasions?: string[] | null
  seasons?: string[] | null
}

/**
 * Build the canonical text we embed for an item. Leads with the free-text
 * description, then folds in the structured tags so colour/occasion/season
 * words carry weight in the vector. Keep this in ONE place — the write path and
 * the backfill script must produce identical text or old and new vectors drift.
 */
export function itemEmbedText(a: EmbedItemFields): string {
  return [
    a.description,
    a.category,
    a.subcategory,
    (a.colors ?? []).join(' '),
    a.pattern,
    a.fabric,
    a.fit,
    (a.occasions ?? []).join(' '),
    (a.seasons ?? []).join(' '),
  ]
    .filter((s) => s && String(s).trim())
    .join('. ')
}

/**
 * Embed a piece of text with Gemini (`gemini-embedding-001`, 768-dim). Throws on
 * failure so callers decide whether to degrade (upload stores a null vector and
 * stays tag-searchable) or surface the error (query path). Uses REST directly so
 * `outputDimensionality` is passed reliably regardless of SDK version.
 */
export async function embedText(text: string): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
        outputDimensionality: EMBED_DIMS,
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    },
  )
  if (!res.ok) {
    throw new Error(`embedText ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
  }
  const j = (await res.json()) as { embedding?: { values?: number[] } }
  const values = j.embedding?.values
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('embedText: model returned no vector')
  }
  return values
}

const outfitSchema = {
  type: SchemaType.OBJECT,
  properties: {
    outfits: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          item_ids: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          reasoning: { type: SchemaType.STRING },
          style_tips: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          confidence: { type: SchemaType.NUMBER },
        },
        required: ['item_ids', 'reasoning', 'title'],
      },
    },
  },
  required: ['outfits'],
} as Schema

export interface OutfitCandidate {
  id: string
  category: string | null
  subcategory: string | null
  colors: string[] | null
  description: string | null
}

export interface ComposedOutfit {
  title?: string
  item_ids: string[]
  reasoning: string
  style_tips?: string[]
  confidence?: number
}

const COMPOSE_SYSTEM = `You are a fashion stylist. From ONLY the candidate items provided, compose 2-3 complete outfits that fit the user's request. Each outfit should usually include a top + bottom (or a dress), plus optional outerwear/footwear/accessory. Use only item IDs that appear in the candidates. Prioritize color coordination and occasion appropriateness. Give each outfit a short, punchy editorial 'title' (2-4 words, e.g. "Date-night drama", "Quiet luxury Monday"). In 'reasoning', explain each outfit in one or two sentences. In 'style_tips', give 2-3 very short actionable tips.`

export interface ComposeCtx {
  occasion: string
  season: string
  weather?: unknown
  styleQuery?: string
  /** Items featured in recent daily picks — nudge the stylist somewhere new. */
  avoidIds?: string[]
  /**
   * Exact pairings rejected in THIS session. Combination-level on purpose: a skip
   * says the combo missed, not that the garments are bad, so the pieces stay
   * individually eligible. Ephemeral — never persisted, never learned from.
   */
  avoidCombos?: string[][]
  /** What we know about this person's taste — see lib/taste.ts. */
  taste?: string
  /**
   * Owned-but-rarely-worn item ids. The exploration slot: nudge ONE look toward a
   * neglected piece so the wardrobe rotates instead of collapsing onto favourites.
   * Soft and occasion-gated (these are already occasion-appropriate candidates).
   */
  rediscover?: string[]
}

/**
 * Render weather as an instruction, not a JSON blob. Passing `{"rain":true}` next to
 * an existing `season=monsoon` changed nothing measurable — the model already knew
 * the season, so the raw flag was redundant. Temperature is the genuinely new fact
 * (monsoon says nothing about 22°C vs 34°C), and rain only bites when we say what to
 * DO about it.
 */
function renderWeather(w: unknown): string {
  if (!w || typeof w !== 'object') return 'unknown'
  const { tempC, label, rain } = w as { tempC?: number; label?: string; rain?: boolean }
  if (typeof tempC !== 'number') return 'unknown'
  const base = `${tempC}°C and ${label ?? 'unclear'}`
  if (rain) {
    return `${base}. IT IS ACTUALLY RAINING RIGHT NOW — prefer darker colours and fabrics that cope with wet, and avoid anything pale, delicate or floor-length that would drag through puddles.`
  }
  if (tempC >= 30) return `${base}. It is genuinely hot — favour light, breathable fabrics.`
  if (tempC <= 15) return `${base}. It is cold — layer properly.`
  return base
}

function composePrompt(
  candidates: OutfitCandidate[],
  ctx: ComposeCtx,
): string {
  return `User wants: occasion=${ctx.occasion}, season=${ctx.season}, weather=${renderWeather(
    ctx.weather,
  )}, style=${ctx.styleQuery || 'no preference'}
${ctx.taste ? `\n${ctx.taste}\n` : ''}
Candidate items from their wardrobe:
${JSON.stringify(
  candidates.map((c) => ({
    id: c.id,
    category: c.category,
    subcategory: c.subcategory,
    colors: c.colors,
    description: c.description,
  })),
  null,
  2,
)}
${
  ctx.avoidIds?.length
    ? `
These pieces were featured in the last few days — build something DIFFERENT from the rest of the wardrobe. Only reuse one if nothing else genuinely works for the occasion:
${JSON.stringify(ctx.avoidIds)}
`
    : ''
}${
  ctx.avoidCombos?.length
    ? `
They have already turned these exact pairings down just now — do NOT rebuild them. The individual pieces are still fine; it is the combination that missed, so feel free to restyle any of them with something else:
${JSON.stringify(ctx.avoidCombos)}
`
    : ''
}${
  ctx.rediscover?.length
    ? `
The user OWNS these pieces but rarely or never wears them. Make ONE of your outfits feature a piece from this list — but only where it genuinely suits the occasion — so they rediscover their wardrobe. Never force a piece that doesn't work; the other outfits should still be your best picks:
${JSON.stringify(ctx.rediscover)}
`
    : ''
}
Compose 2-3 outfits.`
}

export async function composeOutfits(
  candidates: OutfitCandidate[],
  ctx: ComposeCtx,
): Promise<ComposedOutfit[]> {
  // Diagnostic: confirms whether the running deployment actually sees the key.
  console.log(
    '[stylist] provider check — OpenRouter key present:',
    !!process.env.OPENROUTER_API_KEY,
    '· model:',
    process.env.OPENROUTER_MODEL ?? '(default gemini-2.5-flash)',
  )

  // Prefer OpenRouter when configured, but NEVER let it take the whole feature
  // down — if it errors (bad model slug, no credits, provider outage), fall
  // back to Gemini so the stylist keeps working.
  if (process.env.OPENROUTER_API_KEY) {
    try {
      return await composeViaOpenRouter(candidates, ctx)
    } catch (err) {
      console.error(
        '[stylist] OpenRouter failed, falling back to Gemini:',
        err instanceof Error ? err.message : err,
      )
    }
  }
  return composeViaGemini(candidates, ctx)
}

// Native Gemini path (structured output via schema).
async function composeViaGemini(
  candidates: OutfitCandidate[],
  ctx: ComposeCtx,
): Promise<ComposedOutfit[]> {
  const model = genAI().getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: outfitSchema,
      temperature: 0.4, // a little variety across the 2-3 looks; items stay constrained
    },
    systemInstruction: COMPOSE_SYSTEM,
  })
  const result = await withTimeout(
    model.generateContent(composePrompt(candidates, ctx)),
    LLM_TIMEOUT_MS,
    'Gemini stylist',
  )
  const parsed = parseJsonOrThrow<{ outfits: ComposedOutfit[] }>(result.response.text(), 'stylist')
  return parsed.outfits ?? []
}

// Model-agnostic composition through OpenRouter. Works with any chat model
// (Claude, GPT, Llama, Gemini…) — JSON is requested in-prompt and parsed defensively.
async function composeViaOpenRouter(
  candidates: OutfitCandidate[],
  ctx: ComposeCtx,
): Promise<ComposedOutfit[]> {
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash'
  const system = `${COMPOSE_SYSTEM}

Return ONLY a valid JSON object of exactly this shape — no markdown fences, no prose:
{"outfits":[{"title":"string","item_ids":["string"],"reasoning":"string","style_tips":["string"],"confidence":0.9}]}`

  const res = await openrouter().chat.completions.create(
    {
      model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: composePrompt(candidates, ctx) },
      ],
    },
    { timeout: LLM_TIMEOUT_MS },
  )
  const text = res.choices[0]?.message?.content ?? ''
  const parsed = JSON.parse(extractJson(text)) as { outfits: ComposedOutfit[] }
  return parsed.outfits ?? []
}