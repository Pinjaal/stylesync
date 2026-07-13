'use client'

import Link from 'next/link'
import { HangerLogo } from '@/components/HangerLogo'

// Shown when a guest taps something that needs an account.
export function LoginPrompt({
  open,
  onClose,
  title = 'Log in to continue',
  message = 'Create a free account to unlock this — it only takes a minute.',
}: {
  open: boolean
  onClose: () => void
  title?: string
  message?: string
}) {
  if (!open) return null
  return (
    <div className="add-overlay" onClick={onClose}>
      <div className="add-card" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <div style={{ width: 58, height: 58, margin: '0 auto 14px' }}>
          <HangerLogo />
        </div>
        <div className="t">{title}</div>
        <p className="d" style={{ margin: '6px 0 18px' }}>
          {message}
        </p>
        <Link href="/signup" className="btn">
          Create free account
        </Link>
        <Link href="/login" className="btn btn--ghost" style={{ marginTop: 10 }}>
          Log in
        </Link>
        <button
          className="tiny dim"
          onClick={onClose}
          style={{ marginTop: 14, background: 'none', width: '100%' }}
        >
          Not now
        </button>
      </div>
    </div>
  )
}
