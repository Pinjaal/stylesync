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
    // 1. Turn the request into a CLIP vector
    const queryText = `${styleQuery || ''} ${occasion} outfit for ${season} weather`.trim()
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
    if (cands.length === 0) {
      return NextResponse.json(
        {
          error:
            'No matching items for that request. Try a different occasion/season, or add more clothes.',
        },
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

    // 5. Shape the response: real items + image URLs, drop empty outfits
    const outfits = composed
      .map((o) => ({
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

    if (outfits.length === 0) {
      return NextResponse.json({ error: 'Could not compose an outfit. Try again.' }, { status: 502 })
    }

    // 6. Save the top pick (best-effort; insert returns an error object, never throws)
    const top = composed[0]
    if (top) {
      await supabase.from('outfits').insert({
        user_id: user.id,
        item_ids: top.item_ids,
        occasion,
        season,
        weather: weather ?? null,
        style_query: styleQuery ?? null,
        reasoning: top.reasoning,
        style_tips: top.style_tips ?? null,
      })
    }

    return NextResponse.json({ outfits })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('recommend error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}