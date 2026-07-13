import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BottomNav } from './_components/BottomNav'

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
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile?.onboarded) {
      redirect('/onboarding')
    }
  }

  return (
    <div className="shell">
      <main className="app-scroll">{children}</main>
      <BottomNav isGuest={!user} />
    </div>
  )
}
