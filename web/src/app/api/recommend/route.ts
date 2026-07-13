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
    const cands = (candidates ?? []) as Candidate[]
    const seen = new Set(cands.map((c) => c.id))
    const pushUnique = (rows: Omit<Candidate, 'similarity'>[]) => {
      for (const i of rows) {
        if (!seen.has(i.id)) {
          cands.push({ ...i, similarity: 0 })
          seen.add(i.id)
        }
      }
    }
    const ITEM_COLS = 'id, category, subcategory, colors, description, cleaned_image_key'

    // The vector search (match_items) applies a similarity cut-off. CLIP's text→image
    // scores are naturally low (~0.2-0.3), so that cut-off routinely starves the
    // stylist down to 1-3 items even when the closet has many occasion-appropriate
    // pieces — which produces thin, repetitive outfits. When the ranked set is thin,
    // top it up with items TAGGED for this occasion so the LLM has enough to work with.
    if (cands.length < 8) {
      const { data: tagged } = await supabase
        .from('items')
        .select(ITEM_COLS)
        .eq('is_active', true)
        .contains('occasions', [occasion.toLowerCase()])
        .limit(24)
      pushUnique((tagged ?? []) as Omit<Candidate, 'similarity'>[])
    }

    // Still thin (e.g. clothes tagged for other occasions)? Fall back to the
    // whole active wardrobe rather than fail.
    if (cands.length < 4) {
      const { data: allItems } = await supabase
        .from('items')
        .select(ITEM_COLS)
        .eq('is_active', true)
        .limit(40)
      pushUnique((allItems ?? []) as Omit<Candidate, 'similarity'>[])
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