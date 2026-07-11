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

  // Upsert (not update): if the profiles row is ever missing — e.g. the signup
  // trigger didn't fire — an update would hit 0 rows and trap the user in an
  // onboarding loop. Upsert creates the row when needed.
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        display_name: input.name.trim() || null,
        gender: input.gender || null,
        style_preferences,
        onboarded: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

  if (error) throw new Error(error.message)

  revalidatePath('/', 'layout')
  return { styleDna }
}
