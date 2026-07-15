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
required: ['category', 'colors', 'occasions', 'seasons', 'description'],
} as Schema
const SYSTEM = `You are a fashion analyst. Look at the clothing item and return structured attributes.

Use these vocabularies (pick from the list, or leave empty if uncertain):
- category: top | bottom | dress | outerwear | footwear | accessory | ethnic
- pattern: solid | striped | checked | floral | graphic | printed | textured | other
- fit: slim | regular | loose | oversized | tailored
- sleeve_length: short | long | three_quarter | sleeveless | strap | n/a
- occasions: casual | work | party | formal | gym | travel | ethnic | date | beach | loungewear
- seasons: summer | winter | monsoon | all-season

For ethnic Indian wear (kurta, saree, lehenga, sherwani, etc.), use category="ethnic" and put the specific name in subcategory.
Colors: plain names (navy blue, beige, off-white, etc.), max 3.
Description: one short sentence describing the item.`

export interface ItemAttributes {
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
  return parseJsonOrThrow<ItemAttributes>(result.response.text(), 'tagging')
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

Return ONLY a valid JSON object with these keys (omit any you're unsure of): category, subcategory, colors (array of strings), pattern, fabric, fit, sleeve_length, neck_type, occasions (array), seasons (array), features (array), description. No markdown, no prose.`

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

function composePrompt(
  candidates: OutfitCandidate[],
  ctx: { occasion: string; season: string; weather?: unknown; styleQuery?: string },
): string {
  return `User wants: occasion=${ctx.occasion}, season=${ctx.season}, weather=${JSON.stringify(
    ctx.weather ?? {},
  )}, style=${ctx.styleQuery || 'no preference'}

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

Compose 2-3 outfits.`
}

export async function composeOutfits(
  candidates: OutfitCandidate[],
  ctx: { occasion: string; season: string; weather?: unknown; styleQuery?: string },
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
  ctx: { occasion: string; season: string; weather?: unknown; styleQuery?: string },
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
  ctx: { occasion: string; season: string; weather?: unknown; styleQuery?: string },
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