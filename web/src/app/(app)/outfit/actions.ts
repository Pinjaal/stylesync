'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Why a skip reason exists: a left-swipe is ONE ambiguous bit. It could mean wrong
 * occasion, bad pairing, or just "not today" — and blaming the garments for any of
 * those would bury pieces the user actually likes. So:
 *
 *  - the rating is stored on the OUTFIT, never on its items (the negative is
 *    evidence against the combination, not the pieces);
 *  - the outfit row already carries occasion + season, so every negative is
 *    context-scoped for free — "skipped for work" can never leak into "for a party";
 *  - the reason (when given) is the label that makes the bit interpretable later.
 *
 * Nothing here down-weights an item. That deliberately waits for enough labelled
 * data to isolate an item across DIFFERENT combinations.
 */
export type SkipReason = 'occasion' | 'combo' | 'mood' | 'piece'

export async function rateOutfit(outfitId: string, rating: -1 | 1, reason?: SkipReason) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const { error } = await supabase
    .from('outfits')
    .update({ user_rating: rating })
    .eq('id', outfitId)
  if (error) throw new Error(error.message)

  await supabase.from('usage_events').insert({
    user_id: user.id,
    outfit_id: outfitId,
    event_type: 'rated',
    metadata: reason ? { rating, reason } : { rating },
  })
}

/** Follow-up label after a skip is already recorded. Best-effort — never blocks the deck. */
export async function logSkipReason(outfitId: string, reason: SkipReason) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('usage_events').insert({
    user_id: user.id,
    outfit_id: outfitId,
    event_type: 'skip_reason',
    metadata: { reason },
  })
}

export async function markOutfitWorn(outfitId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_outfit_worn', { p_outfit_id: outfitId })
  if (error) throw new Error(error.message)
}