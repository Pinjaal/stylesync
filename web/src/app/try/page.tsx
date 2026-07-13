import { redirect } from 'next/navigation'
import { getAuthState } from '@/lib/authRouting'
import { TryDemo } from './TryDemo'

export const dynamic = 'force-dynamic'

export default async function TryPage() {
  // Signed-in users have their real closet — send them there instead of the demo.
  const { path } = await getAuthState()
  if (path) redirect(path)

  return <TryDemo />
}
