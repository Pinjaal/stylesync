'use server'

import { createClient } from '@/lib/supabase/server'

export async function rateOutfit(outfitId: string, rating: -1 | 1) {
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
    metadata: { rating },
  })
}

export async function markOutfitWorn(outfitId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_outfit_worn', { p_outfit_id: outfitId })
  if (error) throw new Error(error.message)
}