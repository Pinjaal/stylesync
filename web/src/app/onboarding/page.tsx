import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingFlow } from './OnboardingFlow'
import type { StylePreferences } from '@/lib/styleDna'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, gender, style_preferences, onboarded')
    .eq('id', user.id)
    .maybeSingle()

  const prefs = (profile?.style_preferences ?? {}) as StylePreferences

  return (
    <OnboardingFlow
      initial={{
        name: profile?.display_name ?? '',
        gender: profile?.gender ?? '',
        ageGroup: prefs.ageGroup ?? '',
        vibes: prefs.vibes ?? [],
        occasions: prefs.occasions ?? [],
        colors: prefs.colors ?? [],
      }}
      isEdit={Boolean(profile?.onboarded)}
    />
  )
}
