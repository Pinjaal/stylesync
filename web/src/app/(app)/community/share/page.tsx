import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getShareData } from '../data'
import { ShareForm } from './ShareForm'

export const dynamic = 'force-dynamic'

export default async function SharePage(props: {
  searchParams: Promise<{ challenge?: string }>
}) {
  const { challenge } = await props.searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { looks, challenges } = await getShareData(supabase).catch(() => ({
    looks: [],
    challenges: [] as { id: string; tag: string }[],
  }))

  return (
    <ShareForm
      uid={user.id}
      looks={looks}
      challenges={challenges}
      preChallenge={challenge ?? null}
    />
  )
}
