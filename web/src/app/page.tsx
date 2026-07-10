import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HangerLogo } from '@/components/HangerLogo'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded')
      .eq('id', user.id)
      .maybeSingle()
    redirect(profile?.onboarded ? '/closet' : '/onboarding')
  }

  return (
    <main className="splash">
      <div className="splash-mark">
        <HangerLogo className="spark--xl" />
      </div>
      <div className="splash-logo">
        Style<em>Sync</em>
      </div>
      <div className="splash-sub">Your closet, styled.</div>
      <div className="splash-cta">
        <Link href="/signup" className="btn">
          Get started
        </Link>
      </div>
      <div className="splash-note">
        Already have an account? <Link href="/login">Log in</Link>
      </div>
    </main>
  )
}
