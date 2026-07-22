import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Builds the "what do we know about this person" block for the stylist prompt.
 *
 * Design rules, in order of how much trouble ignoring them causes:
 *
 * 1. POSITIVES AND NEGATIVES ARE NOT SYMMETRIC. A wrong positive shows you an
 *    outfit you shrug at. A wrong negative removes a garment from your life and,
 *    because it stops being shown, never earns its way back. So positives are used
 *    freely; negatives are used narrowly.
 * 2. NEGATIVES ARE ABOUT COMBINATIONS, NOT PIECES. A skip is one ambiguous bit —
 *    we pass the rejected pairing, never "avoid this item".
 * 3. NEGATIVES ARE CONTEXT-SCOPED. Only skips recorded for THIS occasion count;
 *    "not for work" must never leak into "for a party".
 * 4. 'mood' ("Not today") IS NOISE BY DEFINITION and is dropped entirely.
 * 5. COLD START: below MIN_POSITIVES we send no taste at all rather than let one
 *    stray save convince the model you only ever wear navy.
 *
 * Nothing here down-weights an individual item. That waits until there are enough
 * labelled skips to isolate a piece across DIFFERENT combinations.
 */

const MIN_POSITIVES = 3
const MAX_POSITIVES = 8
const MAX_NEGATIVES = 4

type DB = SupabaseClient

interface OutfitRow {
  id: string
  item_ids: string[] | null
}

function phrase(ids: string[], labels: Map<string, string>): string | null {
  const names = ids.map((id) => labels.get(id)).filter(Boolean)
  return names.length ? names.join(' + ') : null
}

export async function buildTasteContext(
  supabase: DB,
  opts: { occasion: string; vibes: string[]; dnaTitle?: string | null },
): Promise<string | undefined> {
  const [posRes, negRes, moodRes] = await Promise.all([
    // Kept = saved or actually worn. RLS scopes all of these to the caller.
    supabase
      .from('outfits')
      .select('id, item_ids')
      .or('user_rating.eq.1,was_worn.eq.true')
      .order('created_at', { ascending: false })
      .limit(MAX_POSITIVES)
      .returns<OutfitRow[]>(),
    // Rejected FOR THIS OCCASION only.
    supabase
      .from('outfits')
      .select('id, item_ids')
      .eq('user_rating', -1)
      .eq('occasion', occasionKey(opts.occasion))
      .order('created_at', { ascending: false })
      .limit(MAX_NEGATIVES * 2)
      .returns<OutfitRow[]>(),
    // "Not today" — carries no information about the clothes.
    supabase
      .from('usage_events')
      .select('outfit_id')
      .eq('event_type', 'skip_reason')
      .eq('metadata->>reason', 'mood')
      .limit(100)
      .returns<{ outfit_id: string | null }[]>(),
  ])

  const positives = posRes.data ?? []
  const moodIds = new Set((moodRes.data ?? []).map((r) => r.outfit_id).filter(Boolean))
  const negatives = (negRes.data ?? []).filter((o) => !moodIds.has(o.id)).slice(0, MAX_NEGATIVES)

  // Resolve item ids -> human labels in one query.
  const ids = [...new Set([...positives, ...negatives].flatMap((o) => o.item_ids ?? []))]
  const labels = new Map<string, string>()
  if (ids.length) {
    const { data } = await supabase
      .from('items')
      .select('id, name, subcategory, category, colors')
      .in('id', ids)
      .returns<
        { id: string; name: string | null; subcategory: string | null; category: string | null; colors: string[] | null }[]
      >()
    for (const i of data ?? []) {
      const base = i.name || i.subcategory || i.category || 'piece'
      labels.set(i.id, i.colors?.[0] ? `${i.colors[0]} ${base}` : base)
    }
  }

  const lines: string[] = []

  const vibe = [opts.dnaTitle, ...opts.vibes].filter(Boolean).join(', ')
  if (vibe) lines.push(`Their style identity: ${vibe}.`)

  if (positives.length >= MIN_POSITIVES) {
    const kept = positives
      .map((o) => phrase(o.item_ids ?? [], labels))
      .filter(Boolean)
      .slice(0, MAX_POSITIVES)
    if (kept.length) lines.push(`Looks they kept: ${kept.join('; ')}.`)
  }

  if (negatives.length) {
    const passed = negatives
      .map((o) => phrase(o.item_ids ?? [], labels))
      .filter(Boolean)
    if (passed.length) {
      lines.push(
        `Combinations they passed on for ${opts.occasion}: ${passed.join('; ')}. ` +
          `Treat this as the PAIRING not working — these pieces are still fine on their own.`,
      )
    }
  }

  if (!lines.length) return undefined
  lines.push('Lean toward what they keep. Do not rebuild a combination they passed on.')
  return lines.join('\n')
}

/** The stylist takes free-text occasions; outfits.occasion stores the canonical key. */
function occasionKey(occasion: string): string {
  return occasion.trim().toLowerCase()
}

/**
 * Segments ("Work capsule", "Goa trip") are the user hand-labelling their own
 * taste — a strong, explicit signal the stylist has never seen. We list each
 * named set and WHICH OF THE CURRENT CANDIDATES belong to it, then let the model
 * decide relevance: "Work capsule" fits work, "Goa trip" fits beach/travel, and
 * the LLM maps those far better than any hard-coded keyword table would.
 *
 * Scoped to the candidate pool on purpose: a set whose pieces aren't in play this
 * request is noise. And it's a soft "prefer", never a filter — consistent with
 * order-don't-exclude.
 */
const MAX_SEGMENTS = 4
const MAX_SEG_MEMBERS = 8

export async function buildSegmentContext(
  supabase: DB,
  candidateIds: string[],
): Promise<string | undefined> {
  if (!candidateIds.length) return undefined
  const inPool = new Set(candidateIds)

  const [{ data: segs }, { data: members }] = await Promise.all([
    supabase.from('segments').select('id, name').order('created_at', { ascending: false }),
    supabase.from('segment_items').select('segment_id, item_id'),
  ])
  if (!segs?.length) return undefined

  const byId = new Map<string, { name: string; ids: string[] }>()
  for (const s of segs as { id: string; name: string }[]) byId.set(s.id, { name: s.name, ids: [] })
  for (const m of (members ?? []) as { segment_id: string; item_id: string }[]) {
    if (inPool.has(m.item_id)) byId.get(m.segment_id)?.ids.push(m.item_id)
  }

  const lines = [...byId.values()]
    .filter((s) => s.ids.length)
    .slice(0, MAX_SEGMENTS)
    .map((s) => `- "${s.name}": ${JSON.stringify(s.ids.slice(0, MAX_SEG_MEMBERS))}`)
  if (!lines.length) return undefined

  return (
    `The user groups some of their own pieces into named sets. If the occasion suits one of these, favour its pieces:\n` +
    lines.join('\n')
  )
}
