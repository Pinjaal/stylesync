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