import Link from 'next/link'
import { login } from '@/app/auth/actions'
import { Spark } from '@/components/Spark'

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await props.searchParams

  return (
    <main className="auth-screen">
      <div className="auth-top">
        <Spark className="auth-mark" />
        <div className="auth-h">Welcome back</div>
        <div className="auth-sub">Log in to your digital closet.</div>
      </div>

      <form action={login}>
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
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>
        <button type="submit" className="btn" style={{ marginTop: 8 }}>
          Log in
        </button>
      </form>

      <div className="auth-foot">
        New here? <Link href="/signup">Create an account</Link>
      </div>
    </main>
  )
}
