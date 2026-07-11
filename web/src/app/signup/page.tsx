import { redirect } from 'next/navigation'
import { getAuthState } from '@/lib/authRouting'
import { SignupForm } from '@/app/_components/SignupForm'

export const dynamic = 'force-dynamic'

export default async function SignupPage(props: {
  searchParams: Promise<{ reset?: string }>
}) {
  const { reset } = await props.searchParams

  // A signed-in user should never see the signup screen.
  // (The 3 signup steps happen client-side, so this only fires on a fresh load.)
  const { path } = await getAuthState()
  if (path) redirect(path)

  return <SignupForm reset={reset === '1'} />
}
