import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Spark } from '@/components/Spark'

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
        <Spark className="spark--xl" />
        <svg
          className="sprinkle"
          style={{ top: -6, left: -30 }}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2c.4 4 1.6 5.2 6 6-4.4.8-5.6 2-6 6-.4-4-1.6-5.2-6-6 4.4-.8 5.6-2 6-6Z" />
        </svg>
        <svg
          className="sprinkle"
          style={{ bottom: -2, right: -34, animationDelay: '.8s' }}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2c.4 4 1.6 5.2 6 6-4.4.8-5.6 2-6 6-.4-4-1.6-5.2-6-6 4.4-.8 5.6-2 6-6Z" />
        </svg>
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
