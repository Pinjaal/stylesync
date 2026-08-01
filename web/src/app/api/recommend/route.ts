import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { composeOutfits, embedText } from '@/lib/gemini'
import { getSignedUrls } from '@/lib/storage'
import { buildTasteContext, buildSegmentContext } from '@/lib/taste'
import { getWeather, coordsFromRequest } from '@/lib/weather'
import { rateLimit } from '@/lib/rateLimit'
import { itemAffinity, outfitMatch, type Affinity } from '@/lib/metrics'

// Embedding (possibly a cold HF Space) + Gemini can be slow; take the full window.
export const maxDuration = 60

const MAX_STYLE_QUERY = 300

interface Candidate {
  id: string
  category: string | null
  subcategory: string | null
  colors: string[] | null
  description: string | null
  cleaned_image_key: string | null
  similarity: number
}

interface DailyRow {
  id: string
  item_ids: string[]
  reasoning: string
  style_tips: string[] | null
  title?: string | null
  confidence?: number | null
}
interface ItemRow {
  id: string
  category: string | null
  subcategory: string | null
  colors: string[] | null
  cleaned_image_key: string | null
}

type DB = Awaited<ReturnType<typeof createClient>>

/**
 * Re-read the pick already generated for today so the Style home shows the SAME
 * look all day instead of regenerating (and writing new rows) on every load.
 * Returns null when there's no pick yet, or its items have since been removed —
 * either way the caller falls through and generates a fresh one.
 * RLS scopes `outfits` to the current user, matching the rest of the codebase.
 */
async function readDailyLook(supabase: DB, dayStart: string) {
  const base = supabase
    .from('outfits')
    .select('id, item_ids, reasoning, style_tips, title, confidence')
    .eq('source', 'daily')
    .gte('created_at', dayStart)
    .order('created_at', { ascending: false })
    .limit(1)

  let row: DailyRow | null = null
  const withMeta = await base.maybeSingle()
  if (withMeta.error) {
    // 0004_outfit_meta not applied — fall back to the columns that always exist.
    const basic = await supabase
      .from('outfits')
      .select('id, item_ids, reasoning, style_tips')
      .eq('source', 'daily')
      .gte('created_at', dayStart)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    row = (basic.data as DailyRow | null) ?? null
  } else {
    row = (withMeta.data as DailyRow | null) ?? null
  }
  if (!row?.item_ids?.length) return null

  const { data: items } = await supabase
    .from('items')
    .select('id, category, subcategory, colors, cleaned_image_key')
    .in('id', row.item_ids)
    .eq('is_active', true)
    .returns<ItemRow[]>()

  const byId = new Map((items ?? []).map((i) => [i.id, i]))
  const ordered = row.item_ids.map((id) => byId.get(id)).filter((i): i is ItemRow => Boolean(i))
  if (!ordered.length) return null // items deleted since — regenerate instead

  const urlMap = await getSignedUrls(
    ordered.map((i) => i.cleaned_image_key).filter((k): k is string => Boolean(k)),
  )
  return {
    id: row.id,
    title: row.title ?? null,
    reasoning: row.reasoning,
    style_tips: row.style_tips ?? [],
    confidence: row.confidence ?? null,
    items: ordered.map((c) => ({
      id: c.id,
      category: c.category,
      subcategory: c.subcategory,
      colors: c.colors,
      imageUrl: c.cleaned_image_key ? urlMap[c.cleaned_image_key] ?? null : null,
    })),
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    occasion?: string
    season?: string
    weather?: unknown
    styleQuery?: string
    mode?: string
    dayStart?: string
    avoidCombos?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { occasion, season, weather, mode, dayStart } = body

  // Pairings the user just swiped away, sent by the client and therefore untrusted:
  // clamp the shape and size before it reaches a prompt. Session-only — nothing here
  // is stored or learned from.
  const avoidCombos: string[][] = Array.isArray(body.avoidCombos)
    ? body.avoidCombos
        .filter((c): c is string[] => Array.isArray(c) && c.every((x) => typeof x === 'string'))
        .map((c) => c.slice(0, 6))
        .slice(0, 8)
    : []
  if (!occasion || !season) {
    return NextResponse.json({ error: 'occasion and season are required' }, { status: 400 })
  }
  const styleQuery =
    typeof body.styleQuery === 'string' ? body.styleQuery.slice(0, MAX_STYLE_QUERY) : undefined

  // Each call fans out to an embedding service + a paid LLM, so cap per-user
  // request volume to blunt runaway or abusive usage.
  const rl = rateLimit(`recommend:${user.id}`, 20, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  // The Style home's auto "today's look". Tagged source='daily' so it is excluded
  // from the streak, and reused for the rest of the day rather than regenerated
  // on every page load (which used to write 2-3 rows per visit).
  const isDaily = mode === 'daily'

  try {
    if (isDaily && dayStart) {
      const todays = await readDailyLook(supabase, dayStart)
      if (todays) return NextResponse.json({ outfits: [todays] })
    }

    // The onboarding profile. NOTE: until now `vibes` only ever reached the CLIP
    // query text below — i.e. the vector search whose results the tag top-up
    // largely overrides — so the stylist had never actually seen a user's Style
    // DNA despite the onboarding flow promising exactly that. It now also goes
    // into the prompt via buildTasteContext().
    const { data: profile } = await supabase
      .from('profiles')
      .select('style_preferences')
      .eq('id', user.id)
      .maybeSingle()
    const prefs = (profile?.style_preferences ?? {}) as {
      vibes?: string[]
      styleDna?: { title?: string }
    }
    const vibes = prefs.vibes ?? []
    const vibeText = vibes.length ? `${vibes.join(', ')} style, ` : ''

    // 1. Turn the request into a text-embedding vector (same model the items are
    // embedded with, so query and items share one space).
    const queryText =
      `${vibeText}${styleQuery || ''} ${occasion} outfit for ${season} weather`.trim()
    const embedding = await embedText(queryText)

    // 2. Pull the best-matching candidates from the wardrobe
    const { data: candidates, error } = await supabase.rpc('match_items', {
      p_user_id: user.id,
      p_query_embedding: embedding,
      p_limit: 20,
    })
    // Don't fail the request if vector search is unavailable (e.g. the 768-dim
    // migration hasn't been applied yet, or no item has a vector) — the tag
    // top-up below fills the candidate set. We just lose semantic ranking.
    if (error) {
      console.warn('recommend match_items unavailable, falling back to tags:', error.message)
    }
    const cands = (error ? [] : (candidates ?? [])) as Candidate[]
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

    // match_items ranks the whole active closet by text-embedding similarity and
    // returns the top 20 (no hard cut-off). For small or newly-migrated closets
    // some items may still lack a vector, so top up with items TAGGED for this
    // occasion to guarantee the stylist has enough to work with.
    if (cands.length < 8) {
      const { data: tagged } = await supabase
        .from('items')
        .select(ITEM_COLS)
        .eq('user_id', user.id) // defence-in-depth; do not rely on RLS alone
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
        .eq('user_id', user.id) // defence-in-depth; do not rely on RLS alone
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

    // Daily pick: steer away from what the last few days already featured.
    // Without this the inputs are byte-identical every weekday (occasion 'work',
    // same season, no styleQuery, same closet), so the model returns the SAME
    // look each day — caching a deterministic call doesn't make it vary.
    // We only reach here when today has no pick yet, so these rows are prior days.
    let avoidIds: string[] | undefined
    if (isDaily) {
      const { data: recent } = await supabase
        .from('outfits')
        .select('item_ids')
        .eq('source', 'daily')
        .order('created_at', { ascending: false })
        .limit(4)
        .returns<{ item_ids: string[] | null }[]>()
      const ids = [...new Set((recent ?? []).flatMap((r) => r.item_ids ?? []))]
      // Never avoid so much that there's nothing left to style with.
      if (ids.length && ids.length < cands.length) avoidIds = ids
    }

    // Real conditions, not a guess. `weather` had been threaded all the way into
    // the prompt and was ALWAYS {} — the stylist kept saying "Monsoon Office Chic"
    // with no idea whether it was actually raining. Falls back to whatever the
    // caller sent (nothing, today) when Vercel's geo headers are absent, e.g. local.
    const coords = coordsFromRequest(req)
    const live = coords ? await getWeather(coords.lat, coords.lon) : null
    const weatherNow = live ?? weather ?? null

    // What we know about this person: their Style DNA, the looks they kept, and
    // (scoped to this occasion) the pairings they passed on. Best-effort — taste
    // is a bonus signal, never a reason to fail a recommendation.
    let taste: string | undefined
    try {
      const [taste0, segs] = await Promise.all([
        buildTasteContext(supabase, {
          occasion,
          vibes,
          dnaTitle: prefs.styleDna?.title ?? null,
        }),
        // Segments = the user's own hand-labelled sets ("Work capsule"), scoped to
        // the pieces actually in play this request. A bonus nudge, never required.
        buildSegmentContext(supabase, cands.map((c) => c.id)),
      ])
      taste = [taste0, segs].filter(Boolean).join('\n\n') || undefined
    } catch (err) {
      console.error('taste context failed (continuing without):', err)
    }

    // Exploration slot: which of the (occasion-appropriate) candidates does the
    // user own but never/rarely wear? Nudge one look toward these so the wardrobe
    // rotates. Skipped for the daily pick (that's one canonical look, not a browse).
    let rediscover: string[] | undefined
    if (!isDaily && cands.length) {
      const { data: wornRows } = await supabase
        .from('items')
        .select('id, times_worn')
        .in('id', cands.map((c) => c.id))
        .returns<{ id: string; times_worn: number | null }[]>()
      const neglected = (wornRows ?? [])
        .filter((r) => (r.times_worn ?? 0) === 0)
        .map((r) => r.id)
        .slice(0, 8)
      // Only nudge if there's a real mix — if EVERYTHING is unworn (brand-new
      // closet) the nudge is meaningless, and if nothing is, there's nothing to do.
      if (neglected.length && neglected.length < cands.length) rediscover = neglected
    }

    // 3. Let Gemini compose outfits from those candidates
    const composed = await composeOutfits(cands, {
      occasion,
      season,
      weather: weatherNow,
      styleQuery,
      avoidIds,
      avoidCombos: avoidCombos.length ? avoidCombos : undefined,
      taste,
      rediscover,
    })

    // Per-item taste scores → a real match % (see outfitMatch). Best-effort; an
    // empty map just means every look falls back to the model's own confidence.
    let aff = new Map<string, Affinity>()
    try {
      aff = await itemAffinity(supabase)
    } catch (err) {
      console.error('affinity failed (match falls back to confidence):', err)
    }

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
        // `confidence` now carries the personalized match (0..1, or null when
        // there's no signal) rather than the model's raw self-rating — it's what
        // the deck's % chip renders, and null hides the chip instead of faking one.
        confidence: outfitMatch(o.confidence, o.item_ids, aff),
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

    // The daily pick keeps exactly one look, so the day has a single canonical
    // answer that re-reads return unchanged.
    const toPersist = isDaily ? displayOutfits.slice(0, 1) : displayOutfits

    // 6. Save the shown outfits, capture their IDs (best-effort).
    // source: 'ai' = the user asked ("Style me") and counts toward their streak.
    //         'daily' = the auto pick on the Style home; excluded from the streak
    //         so merely opening the app never builds one.
    let ids: (string | null)[] = toPersist.map(() => null)
    const baseRows = toPersist.map((o) => ({
      user_id: user.id,
      item_ids: o.item_ids,
      occasion,
      season,
      weather: weatherNow,
      style_query: styleQuery ?? null,
      reasoning: o.reasoning,
      style_tips: o.style_tips.length ? o.style_tips : null,
      source: isDaily ? 'daily' : 'ai',
    }))
    const rows = baseRows.map((r, i) => ({
      ...r,
      title: toPersist[i].title,
      confidence: toPersist[i].confidence,
    }))

    let saved = await supabase.from('outfits').insert(rows).select('id')
    if (saved.error && /title|confidence|column|schema cache/i.test(saved.error.message)) {
      // 0004_outfit_meta not applied — persist without the editorial meta.
      saved = await supabase.from('outfits').insert(baseRows).select('id')
    }
    if (saved.data && saved.data.length === toPersist.length) {
      ids = saved.data.map((r) => r.id as string)
    }

    const outfits = toPersist.map((o, i) => ({
      id: ids[i],
      title: o.title,
      reasoning: o.reasoning,
      style_tips: o.style_tips,
      confidence: o.confidence,
      items: o.items,
    }))

    return NextResponse.json({ outfits })
  } catch (err) {
    console.error('recommend error:', err)
    return NextResponse.json({ error: 'Something went wrong composing your outfits.' }, { status: 500 })
  }
}