import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { embedText } from '@/lib/processor'
import { composeOutfits } from '@/lib/gemini'
import { getSignedUrls } from '@/lib/storage'

// Embedding (possibly a cold HF Space) + Gemini can be slow; take the full window.
export const maxDuration = 60

interface Candidate {
  id: string
  category: string | null
  subcategory: string | null
  colors: string[] | null
  description: string | null
  cleaned_image_key: string | null
  similarity: number
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { occasion?: string; season?: string; weather?: unknown; styleQuery?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { occasion, season, weather, styleQuery } = body
  if (!occasion || !season) {
    return NextResponse.json({ error: 'occasion and season are required' }, { status: 400 })
  }

  try {
    // Pull the user's onboarding style profile so Spark leans on their vibes.
    const { data: profile } = await supabase
      .from('profiles')
      .select('style_preferences')
      .eq('id', user.id)
      .maybeSingle()
    const vibes = (profile?.style_preferences as { vibes?: string[] } | null)?.vibes ?? []
    const vibeText = vibes.length ? `${vibes.join(', ')} style, ` : ''

    // 1. Turn the request into a CLIP vector
    const queryText =
      `${vibeText}${styleQuery || ''} ${occasion} outfit for ${season} weather`.trim()
    const embedding = await embedText(queryText)

    // 2. Pull the best-matching candidates from the wardrobe
    const { data: candidates, error } = await supabase.rpc('match_items', {
      p_user_id: user.id,
      p_query_embedding: embedding,
      p_occasion: occasion,
      p_season: season,
      p_limit: 20,
    })
    if (error) {
      return NextResponse.json({ error: `Retrieval failed: ${error.message}` }, { status: 500 })
    }
    let cands = (candidates ?? []) as Candidate[]

    // Fallback: the occasion/season-filtered vector search found nothing (small
    // closet, or clothes tagged for other occasions). Rather than fail, compose
    // from the whole active wardrobe and let the stylist pick what fits.
    if (cands.length === 0) {
      const { data: allItems } = await supabase
        .from('items')
        .select('id, category, subcategory, colors, description, cleaned_image_key')
        .eq('is_active', true)
        .limit(40)
      cands = ((allItems ?? []) as Omit<Candidate, 'similarity'>[]).map((i) => ({
        ...i,
        similarity: 0,
      }))
    }

    if (cands.length === 0) {
      return NextResponse.json(
        { error: 'Your closet is empty — add a few clothes and I’ll style them for you.' },
        { status: 404 },
      )
    }

    // 3. Let Gemini compose outfits from those candidates
    const composed = await composeOutfits(cands, { occasion, season, weather, styleQuery })

    // 4. Sign all images once
    const byId = new Map(cands.map((c) => [c.id, c]))
    const keys = cands
      .map((c) => c.cleaned_image_key)
      .filter((k): k is string => Boolean(k))
    const urlMap = await getSignedUrls(keys)

    // 5. Shape display outfits (real items + image URLs), drop empty ones
    const displayOutfits = composed
      .map((o) => ({
        item_ids: o.item_ids.filter((id) => byId.has(id)),
        title: o.title ?? null,
        reasoning: o.reasoning,
        style_tips: o.style_tips ?? [],
        confidence: o.confidence ?? null,
        items: o.item_ids
          .map((id) => byId.get(id))
          .filter((c): c is Candidate => Boolean(c))
          .map((c) => ({
            id: c.id,
            category: c.category,
            subcategory: c.subcategory,
            colors: c.colors,
            imageUrl: c.cleaned_image_key ? urlMap[c.cleaned_image_key] ?? null : null,
          })),
      }))
      .filter((o) => o.items.length > 0)

    if (displayOutfits.length === 0) {
      return NextResponse.json({ error: 'Could not compose an outfit. Try again.' }, { status: 502 })
    }

    // 6. Save every shown outfit, capture their IDs (best-effort)
    let ids: (string | null)[] = displayOutfits.map(() => null)
    const { data: saved } = await supabase
      .from('outfits')
      .insert(
        displayOutfits.map((o) => ({
          user_id: user.id,
          item_ids: o.item_ids,
          occasion,
          season,
          weather: weather ?? null,
          style_query: styleQuery ?? null,
          reasoning: o.reasoning,
          style_tips: o.style_tips.length ? o.style_tips : null,
        })),
      )
      .select('id')
    if (saved && saved.length === displayOutfits.length) {
      ids = saved.map((r) => r.id as string)
    }

    const outfits = displayOutfits.map((o, i) => ({
      id: ids[i],
      title: o.title,
      reasoning: o.reasoning,
      style_tips: o.style_tips,
      confidence: o.confidence,
      items: o.items,
    }))

    return NextResponse.json({ outfits })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('recommend error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}