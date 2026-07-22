import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Does the stylist actually work? Until now there was no way to tell — we shipped
 * three recommender changes (taste memory, daily variation, weather) and argued
 * about screenshots. This is the number that replaces the argument.
 *
 *   save rate = looks you KEPT / looks you were SHOWN
 *
 * Two things that would quietly make it a lie, both handled:
 *
 * 1. EXCLUDE source='daily'. The daily pick is auto-generated once a day and
 *    nobody chose to see it, so counting it as a "shown" impression drags the
 *    rate toward zero and would mask real movement.
 * 2. COMPARE PERIODS. A single lifetime number can't answer "did that change
 *    help?" — only last-7-days vs the 7 before it can.
 *
 * Coverage is the counterweight: a rate that climbs while coverage falls means
 * the recommender is narrowing onto a few safe pieces, not getting smarter.
 */

type DB = SupabaseClient

export interface StylistMetrics {
  shown7: number
  kept7: number
  rate7: number | null
  shownPrev: number
  keptPrev: number
  ratePrev: number | null
  /** percentage points, current vs previous 7 days. null when either side is empty. */
  delta: number | null
  coverage30: number
  pieces: number
}

const DAY = 24 * 60 * 60 * 1000
const iso = (ms: number) => new Date(ms).toISOString()

export interface Affinity {
  score: number // 0..1, smoothed. 0.5 = neutral / unknown.
  n: number // how many rated outfits this item appeared in (0 = no real signal)
}

/**
 * Per-item taste score from the user's own history. Wearing counts double a save
 * (a save is a maybe; putting it on your body is the vote). Smoothed with a
 * Beta(1,1) prior so a single event can't create a 100%/0% item — an unseen item
 * sits at exactly 0.5. This powers the match % (see outfitMatch); it does NOT
 * order or filter candidates, so it can't bury a garment. That's Phase 2, gated
 * on ~50 skips.
 */
export async function itemAffinity(supabase: DB): Promise<Map<string, Affinity>> {
  const { data } = await supabase
    .from('outfits')
    .select('item_ids, user_rating, was_worn')
    .neq('source', 'daily')
    .limit(600)
    .returns<{ item_ids: string[] | null; user_rating: number | null; was_worn: boolean | null }[]>()

  const agg = new Map<string, { pos: number; neg: number; n: number }>()
  for (const o of data ?? []) {
    const worn = o.was_worn ? 1 : 0
    const loved = o.user_rating === 1 ? 1 : 0
    const passed = o.user_rating === -1 ? 1 : 0
    const pos = worn * 2 + loved
    if (!pos && !passed) continue // shown-but-unrated tells us nothing here
    for (const id of o.item_ids ?? []) {
      const a = agg.get(id) ?? { pos: 0, neg: 0, n: 0 }
      a.pos += pos
      a.neg += passed
      a.n += 1
      agg.set(id, a)
    }
  }

  const out = new Map<string, Affinity>()
  for (const [id, a] of agg) {
    out.set(id, { score: (a.pos + 1) / (a.pos + a.neg + 2), n: a.n })
  }
  return out
}

/**
 * A real, personalized match % for a look — or null when there's genuinely no
 * signal (in which case the UI hides the chip rather than invent one; the old
 * code hashed the title into a fake 84-98%).
 *
 * Blend: mostly the stylist's own confidence, nudged by how the user has
 * historically responded to these exact pieces. Unrated pieces contribute the
 * neutral 0.5, so unknowns don't distort — a saved piece lifts the score, a
 * skipped one lowers it.
 */
export function outfitMatch(
  confidence: number | null | undefined,
  itemIds: string[],
  aff: Map<string, Affinity>,
): number | null {
  const hasRated = itemIds.some((id) => (aff.get(id)?.n ?? 0) > 0)
  if (confidence == null && !hasRated) return null

  const conf = confidence ?? 0.75 // model gave none — assume a decent look
  const affMean = itemIds.length
    ? itemIds.reduce((s, id) => s + (aff.get(id)?.score ?? 0.5), 0) / itemIds.length
    : 0.5
  const blended = conf * 0.7 + affMean * 0.3
  return Math.min(0.99, Math.max(0.55, blended))
}

export async function getStylistMetrics(supabase: DB): Promise<StylistMetrics> {
  const now = Date.now()
  const d7 = iso(now - 7 * DAY)
  const d14 = iso(now - 14 * DAY)
  const d30 = iso(now - 30 * DAY)

  // head:true + count:exact => counts without shipping rows.
  const shown = (from: string, to?: string) => {
    let q = supabase
      .from('outfits')
      .select('id', { count: 'exact', head: true })
      .neq('source', 'daily')
      .gte('created_at', from)
    if (to) q = q.lt('created_at', to)
    return q
  }
  const kept = (from: string, to?: string) => {
    let q = supabase
      .from('outfits')
      .select('id', { count: 'exact', head: true })
      .neq('source', 'daily')
      .or('user_rating.eq.1,was_worn.eq.true')
      .gte('created_at', from)
    if (to) q = q.lt('created_at', to)
    return q
  }

  const [s7, k7, sPrev, kPrev, recent, items] = await Promise.all([
    shown(d7),
    kept(d7),
    shown(d14, d7),
    kept(d14, d7),
    supabase
      .from('outfits')
      .select('item_ids')
      .gte('created_at', d30)
      .limit(400)
      .returns<{ item_ids: string[] | null }[]>(),
    supabase
      .from('items')
      .select('id')
      .eq('is_active', true)
      .returns<{ id: string }[]>(),
  ])

  const shown7 = s7.count ?? 0
  const kept7 = k7.count ?? 0
  const shownPrev = sPrev.count ?? 0
  const keptPrev = kPrev.count ?? 0
  const rate7 = shown7 ? Math.round((kept7 / shown7) * 100) : null
  const ratePrev = shownPrev ? Math.round((keptPrev / shownPrev) * 100) : null

  const owned = new Set((items.data ?? []).map((i) => i.id))
  const surfaced = new Set((recent.data ?? []).flatMap((o) => o.item_ids ?? []))
  const covered = [...surfaced].filter((id) => owned.has(id)).length

  return {
    shown7,
    kept7,
    rate7,
    shownPrev,
    keptPrev,
    ratePrev,
    delta: rate7 != null && ratePrev != null ? rate7 - ratePrev : null,
    coverage30: owned.size ? Math.round((covered / owned.size) * 100) : 0,
    pieces: owned.size,
  }
}
