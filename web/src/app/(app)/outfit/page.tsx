import { createClient } from '@/lib/supabase/server'
import { StyleClient } from './StyleClient'
import type { StylePreferences } from '@/lib/styleDna'

export const dynamic = 'force-dynamic'

export default async function OutfitPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, style_preferences')
    .eq('id', user!.id)
    .maybeSingle()

  const prefs = (profile?.style_preferences ?? {}) as StylePreferences
  const firstName = (profile?.display_name ?? '').split(' ')[0] || 'there'

  return <StyleClient name={firstName} dnaTitle={prefs.styleDna?.title ?? null} />
}
