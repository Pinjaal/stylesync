import { redirect } from 'next/navigation'
import { getAuthState } from '@/lib/authRouting'
import { LoginForm } from '@/app/_components/LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  // A signed-in user should never see the login screen.
  const { path } = await getAuthState()
  if (path) redirect(path)

  const { error } = await props.searchParams
  return <LoginForm initialError={error} />
}
