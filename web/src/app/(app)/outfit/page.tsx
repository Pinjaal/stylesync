import { createClient } from '@/lib/supabase/server'
import { StyleClient } from './StyleClient'
import { computeStreak } from '@/lib/streak'
import { GuestStyle } from '../_components/guest/GuestStyle'

export const dynamic = 'force-dynamic'

export default async function OutfitPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return <GuestStyle />

  const [{ data: profile }, { data: outfitRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('outfits')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(400)
      .returns<{ created_at: string }[]>(),
  ])

  const firstName = (profile?.display_name ?? '').split(' ')[0] || 'there'
  const streak = computeStreak((outfitRows ?? []).map((r) => r.created_at))

  return <StyleClient name={firstName} streak={streak} />
}
