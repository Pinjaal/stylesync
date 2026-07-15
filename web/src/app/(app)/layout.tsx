import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { avatarColors, initialOf } from '@/lib/avatar'
import type { StylePreferences } from '@/lib/styleDna'
import { AppNav, type NavMe } from './_components/AppNav'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Guests may browse the app (demo content); account-only actions prompt login.
  // Logged-in users must finish onboarding first.
  let me: NavMe | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, style_preferences, onboarded')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile?.onboarded) {
      redirect('/onboarding')
    }

    // Sidebar profile chip. Mirrors profile/page.tsx so the name matches there.
    const prefs = (profile?.style_preferences ?? {}) as StylePreferences
    const name = profile?.display_name || user.email?.split('@')[0] || 'You'
    const { bg, color } = avatarColors(user.id)
    me = {
      name,
      initial: initialOf(name),
      bg,
      fg: color,
      subtitle: prefs.styleDna?.title ?? 'View profile',
    }
  }

  return (
    <div className="shell">
      <AppNav isGuest={!user} me={me}>
        {children}
      </AppNav>
    </div>
  )
}
