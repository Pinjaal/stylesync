import Link from 'next/link'
import { Spark } from '@/components/Spark'

export function GuestProfile() {
  return (
    <>
      <div className="appbar">
        <div className="title" style={{ fontSize: 22 }}>
          Profile
        </div>
      </div>

      <div className="prof-top">
        <div className="prof-av" style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}>
          <span style={{ width: 40, height: 40, display: 'inline-flex' }}>
            <Spark />
          </span>
        </div>
        <div className="prof-name">You&apos;re browsing as a guest</div>
        <div className="prof-badge">Style DNA locked</div>
      </div>

      <div className="pad">
        <div className="try-cta" style={{ marginTop: 8 }}>
          <div className="h2 serif" style={{ marginBottom: 4 }}>
            Make it <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>yours</em>
          </div>
          <p className="dim" style={{ fontSize: 14, margin: '0 0 14px' }}>
            Create a free account to build your closet, get your Style DNA, save looks and join the community.
          </p>
          <Link href="/signup" className="btn">
            Create free account
          </Link>
          <Link href="/login" className="btn btn--ghost" style={{ marginTop: 10 }}>
            Log in
          </Link>
        </div>
      </div>
      <div style={{ height: 16 }} />
    </>
  )
}
