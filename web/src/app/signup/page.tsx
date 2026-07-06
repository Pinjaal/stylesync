import Link from 'next/link'
import { signup } from '@/app/auth/actions'
import { Spark } from '@/components/Spark'

export default async function SignupPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await props.searchParams

  return (
    <main className="auth-screen">
      <div className="auth-top">
        <Spark className="auth-mark" />
        <div className="auth-h">Welcome to StyleSync</div>
        <div className="auth-sub">Build your digital closet in a minute.</div>
      </div>

      <form action={signup}>
        {error && <p className="alert">{error}</p>}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        </div>
        <button type="submit" className="btn" style={{ marginTop: 8 }}>
          Create account
        </button>
      </form>

      <div className="auth-foot">
        Already a member? <Link href="/login">Log in</Link>
      </div>
      <div className="auth-legal">
        By continuing you agree to StyleSync&apos;s Terms and Privacy Policy.
      </div>
    </main>
  )
}
