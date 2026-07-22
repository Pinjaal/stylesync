'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { HangerLogo } from '@/components/HangerLogo'
import { GoogleButton } from '@/components/GoogleButton'
import { AuthBrandPanel } from './AuthBrandPanel'
import { createClient } from '@/lib/supabase/client'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SignupForm({ reset = false }: { reset?: boolean }) {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const codeRef = useRef<HTMLInputElement>(null)
  const pwRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  async function sendCode() {
    setError(null)
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      // Existing accounts (reset) shouldn't be re-created; new ones should.
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: !reset },
      })
      if (error) throw error
      setStep('code')
      setCooldown(30)
      setTimeout(() => codeRef.current?.focus(), 60)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not send the code'
      setError(
        reset && /signups? not allowed|user not found/i.test(msg)
          ? 'No account with that email yet. Create one instead.'
          : msg,
      )
    } finally {
      setLoading(false)
    }
  }

  async function verify() {
    setError(null)
    if (code.trim().length < 6) {
      setError('Enter the code from your email')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const args = { email: email.trim(), token: code.trim() }
      // New signups verify as type 'signup'; existing emails as 'email' — try both.
      let res = await supabase.auth.verifyOtp({ ...args, type: 'email' })
      if (res.error) res = await supabase.auth.verifyOtp({ ...args, type: 'signup' })
      if (res.error) throw res.error
      // Email verified + now signed in — go set a password.
      setStep('password')
      setTimeout(() => pwRef.current?.focus(), 60)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code did not work')
    } finally {
      setLoading(false)
    }
  }

  async function savePassword() {
    setError(null)
    if (password.length < 8) {
      setError('Use at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      router.replace('/')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not set your password')
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <AuthBrandPanel />
      <main className="auth-screen">
      {step === 'email' && (
        <>
          <div className="auth-top">
            <HangerLogo className="auth-mark" />
            <div className="auth-h">{reset ? 'Reset your password' : 'Welcome to StyleSync'}</div>
            <div className="auth-sub">
              {reset
                ? 'Enter your email and we’ll send a code to verify it.'
                : 'First, verify your email with a quick code.'}
            </div>
          </div>

          {!reset && (
            <>
              <GoogleButton />
              <div className="or-divider">or</div>
            </>
          )}

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
              onKeyDown={(e) => e.key === 'Enter' && sendCode()}
              autoFocus
            />
          </div>

          <button className="btn" style={{ marginTop: 8 }} onClick={sendCode} disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send verification code'}
          </button>

          {!reset && (
            <p className="auth-legal">
              By continuing you agree to our{' '}
              <Link href="/legal/terms">Terms</Link> and{' '}
              <Link href="/legal/privacy">Privacy Policy</Link>.
            </p>
          )}

          <div className="auth-foot">
            Already a member? <Link href="/login">Log in</Link>
          </div>
        </>
      )}

      {step === 'code' && (
        <>
          <div className="auth-top">
            <button
              className="onb-back"
              style={{ margin: '0 auto 16px' }}
              onClick={() => {
                setStep('email')
                setCode('')
                setError(null)
              }}
              aria-label="Change email"
            >
              <ChevronLeft size={18} strokeWidth={2.4} />
            </button>
            <div className="auth-h">Check your email</div>
            <div className="auth-sub">
              We sent a verification code to <b>{email}</b>.
            </div>
          </div>

          {error && <p className="alert">{error}</p>}

          <div className="field">
            <label htmlFor="code">Verification code</label>
            <input
              id="code"
              ref={codeRef}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              placeholder="Enter the code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
              onKeyDown={(e) => e.key === 'Enter' && verify()}
              style={{
                textAlign: 'center',
                fontSize: 26,
                letterSpacing: '0.4em',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
              }}
            />
          </div>

          <button className="btn" style={{ marginTop: 8 }} onClick={verify} disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify email'}
          </button>

          <div className="auth-foot">
            {cooldown > 0 ? (
              <span className="dim">Resend code in {cooldown}s</span>
            ) : (
              <>
                Didn&apos;t get it?{' '}
                <a role="button" onClick={sendCode} style={{ cursor: 'pointer' }}>
                  Resend code
                </a>
              </>
            )}
          </div>
        </>
      )}

      {step === 'password' && (
        <>
          <div className="auth-top">
            <HangerLogo className="auth-mark" />
            <div className="auth-h">{reset ? 'Set a new password' : 'Create a password'}</div>
            <div className="auth-sub">
              Email verified ✓ — {reset ? 'choose a new password' : 'set a password'} you&apos;ll use to log in.
            </div>
          </div>

          {error && <p className="alert">{error}</p>}

          <div className="field">
            <label htmlFor="new-password">Password</label>
            <input
              id="new-password"
              ref={pwRef}
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && savePassword()}
            />
          </div>

          <button className="btn" style={{ marginTop: 8 }} onClick={savePassword} disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : reset ? 'Save password' : 'Create account'}
          </button>
        </>
      )}
      </main>
    </div>
  )
}
