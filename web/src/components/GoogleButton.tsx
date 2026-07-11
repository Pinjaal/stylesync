'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function GoogleButton({ label = 'Continue with Google' }: { label?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go() {
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      // On success the browser is already navigating to Google — no reset needed.
      if (error) {
        setError(error.message)
        setLoading(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Google sign-in')
      setLoading(false)
    }
  }

  return (
    <>
      {error && <p className="alert">{error}</p>}
      <button type="button" className="social-btn" onClick={go} disabled={loading}>
        <svg className="g" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#4285F4"
            d="M22.5 12.2c0-.8-.1-1.6-.2-2.3H12v4.5h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-8.2Z"
          />
          <path
            fill="#34A853"
            d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1-3.8 1-2.9 0-5.3-2-6.2-4.6H2.2v2.8A11 11 0 0 0 12 23Z"
          />
          <path
            fill="#FBBC05"
            d="M5.8 14a6.6 6.6 0 0 1 0-4.2V7H2.2a11 11 0 0 0 0 9.9L5.8 14Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.4c1.6 0 3 .5 4.2 1.6l3.1-3.1A11 11 0 0 0 2.2 7l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4Z"
          />
        </svg>
        {loading ? 'Redirecting…' : label}
      </button>
    </>
  )
}
