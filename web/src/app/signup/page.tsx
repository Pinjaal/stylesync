import { SignupForm } from '@/app/_components/SignupForm'

export default async function SignupPage(props: {
  searchParams: Promise<{ reset?: string }>
}) {
  const { reset } = await props.searchParams
  return <SignupForm reset={reset === '1'} />
}
