import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * Single source of truth for "is this request authenticated, and where should
 * an authenticated user be?" Used by the splash, login and signup pages so a
 * signed-in user can never sit on an auth screen.
 *
 *  - path === null  → not logged in (show the auth/splash screen)
 *  - path === '/onboarding' → logged in but hasn't finished onboarding
 *  - path === '/closet' → logged in and onboarded
 */
export async function getAuthState(): Promise<{
  userId: string | null
  path: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { userId: null, path: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded')
    .eq('id', user.id)
    .maybeSingle()

  return { userId: user.id, path: profile?.onboarded ? '/closet' : '/onboarding' }
}
