import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

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
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: attributeSchema,
      temperature: 0.2,
    },
    systemInstruction: SYSTEM,
  })

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'image/png',
        data: pngBuffer.toString('base64'),
      },
    },
    { text: 'Extract the attributes of this clothing item.' },
  ])

  return JSON.parse(result.response.text())
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

export async function composeOutfits(
  candidates: OutfitCandidate[],
  ctx: { occasion: string; season: string; weather?: unknown; styleQuery?: string },
): Promise<ComposedOutfit[]> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: outfitSchema,
      temperature: 0.4, // a little variety across the 2-3 looks; items stay constrained
    },
    systemInstruction: `You are a fashion stylist. From ONLY the candidate items provided, compose 2-3 complete outfits that fit the user's request. Each outfit should usually include a top + bottom (or a dress), plus optional outerwear/footwear/accessory. Use only item IDs that appear in the candidates. Prioritize color coordination and occasion appropriateness. Give each outfit a short, punchy editorial 'title' (2-4 words, e.g. "Date-night drama", "Quiet luxury Monday"). In 'reasoning', explain each outfit in one or two sentences. In 'style_tips', give 2-3 very short actionable tips.`,
  })

  const prompt = `User wants: occasion=${ctx.occasion}, season=${ctx.season}, weather=${JSON.stringify(
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

  const result = await model.generateContent(prompt)
  const parsed = JSON.parse(result.response.text()) as { outfits: ComposedOutfit[] }
  return parsed.outfits ?? []
}