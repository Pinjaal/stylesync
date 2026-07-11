import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthState } from '@/lib/authRouting'
import { HangerLogo } from '@/components/HangerLogo'

export const dynamic = 'force-dynamic'

export default async function Home() {
  // Logged-in users skip the marketing splash entirely.
  const { path } = await getAuthState()
  if (path) redirect(path)

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
