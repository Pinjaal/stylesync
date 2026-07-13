import { NextResponse } from 'next/server'
import { composeOutfits } from '@/lib/gemini'
import { DEMO_ITEMS } from '@/lib/demo'

// Public (no auth) — styles the DEMO closet for guests via the LLM.
// composeOutfits routes through OpenRouter/Gemini; if that fails the CLIENT
// falls back to the built-in preset looks, so the demo never breaks.
export const maxDuration = 60

export async function POST(req: Request) {
  let body: { occasion?: string; styleQuery?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const occasion = (body.occasion || 'casual').toLowerCase()
  const styleQuery = body.styleQuery?.trim() || undefined

  const candidates = DEMO_ITEMS.map((it) => ({
    id: it.id,
    category: it.category,
    subcategory: it.subcategory,
    colors: it.colors,
    description: `${it.label} — ${(it.colors ?? []).join(', ')} ${it.subcategory ?? it.category}`,
  }))

  try {
    const composed = await composeOutfits(candidates, {
      occasion,
      season: 'all-season',
      styleQuery,
    })

    const byId = new Map(DEMO_ITEMS.map((i) => [i.id, i]))
    const outfits = composed
      .map((o) => ({
        id: null as string | null,
        title: o.title ?? null,
        reasoning: o.reasoning,
        style_tips: o.style_tips ?? [],
        confidence: o.confidence ?? null,
        items: o.item_ids
          .map((id) => byId.get(id))
          .filter(Boolean)
          .map((it) => ({
            id: it!.id,
            category: it!.category,
            subcategory: it!.subcategory,
            colors: it!.colors,
            imageUrl: it!.imageUrl,
          })),
      }))
      .filter((o) => o.items.length > 0)

    if (outfits.length === 0) {
      return NextResponse.json({ error: 'No outfits composed' }, { status: 502 })
    }
    return NextResponse.json({ outfits })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Styling failed'
    console.error('guest-recommend error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
