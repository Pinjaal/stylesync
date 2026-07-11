'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { HangerLogo } from '@/components/HangerLogo'
import { GoogleButton } from '@/components/GoogleButton'
import { AuthBrandPanel } from './AuthBrandPanel'
import { createClient } from '@/lib/supabase/client'

export function LoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError ?? null)

  async function login() {
    setError(null)
    if (!email.trim() || !password) {
      setError('Enter your email and password')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error
      router.replace('/')
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not log in'
      setError(
        /invalid login credentials/i.test(msg)
          ? 'Wrong email or password. New here? Create an account.'
          : msg,
      )
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <AuthBrandPanel />
      <main className="auth-screen">
      <div className="auth-top">
        <HangerLogo className="auth-mark" />
        <div className="auth-h">Welcome back</div>
        <div className="auth-sub">Log in to your digital closet.</div>
      </div>

      <GoogleButton />
      <div className="or-divider">or</div>

      {error && <p className="alert">{error}</p>}

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && login()}
        />
      </div>

      <button className="btn" style={{ marginTop: 8 }} onClick={login} disabled={loading}>
        {loading ? <Loader2 size={18} className="animate-spin" /> : 'Log in'}
      </button>

      <div className="auth-foot">
        New here? <Link href="/signup">Create an account</Link>
      </div>
      <div className="auth-foot" style={{ marginTop: 8 }}>
        <Link href="/signup?reset=1">Forgot password?</Link>
      </div>
      </main>
    </div>
  )
}
