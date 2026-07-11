import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthState } from '@/lib/authRouting'

// Google (and any OAuth provider) redirects back here with a `code`. We exchange
// it for a session, then send the user to onboarding or the closet.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')

  // Behind Vercel the real host is in x-forwarded-host; use it in production.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = process.env.NODE_ENV === 'development'
  const base = isLocal ? origin : forwardedHost ? `https://${forwardedHost}` : origin

  if (oauthError) {
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent('Google sign-in was cancelled.')}`,
    )
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { path } = await getAuthState()
      return NextResponse.redirect(`${base}${path ?? '/onboarding'}`)
    }
  }

  return NextResponse.redirect(
    `${base}/login?error=${encodeURIComponent('Could not sign you in. Please try again.')}`,
  )
}
