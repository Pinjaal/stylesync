'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { computeStyleDna, type StylePreferences } from '@/lib/styleDna'

export interface OnboardingInput {
  name: string
  gender: string
  ageGroup: string
  vibes: string[]
  occasions: string[]
  colors: string[]
}

export async function completeOnboarding(input: OnboardingInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const styleDna = computeStyleDna(input.vibes)

  const style_preferences: StylePreferences = {
    ageGroup: input.ageGroup || undefined,
    vibes: input.vibes,
    occasions: input.occasions,
    colors: input.colors,
    styleDna,
  }

  // profiles row is auto-created on signup; upsert keeps this safe either way.
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: input.name.trim() || null,
      gender: input.gender || null,
      style_preferences,
      onboarded: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/', 'layout')
  return { styleDna }
}
