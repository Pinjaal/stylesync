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
