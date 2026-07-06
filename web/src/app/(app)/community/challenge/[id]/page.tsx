import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft, Heart, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { LookCollage } from '@/app/(app)/outfit/_components/LookCollage'
import { getChallenge } from '../../data'

export const dynamic = 'force-dynamic'

export default async function ChallengePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const c = await getChallenge(supabase, user.id, id).catch(() => null)
  if (!c) notFound()

  const [g1, g2] = c.grad.split(',')

  return (
    <>
      <div className="chal-hero" style={{ background: `linear-gradient(160deg, ${g1}, ${g2})` }}>
        <div className="blob" />
        <div className="inner">
          <Link href="/community" className="back" aria-label="Back">
            <ChevronLeft size={18} strokeWidth={2.2} />
          </Link>
          <div className="k">Challenge · {c.daysLeft} days left</div>
          <h1>#{c.tag}</h1>
          {c.description && <p>{c.description}</p>}
          <div className="chal-stats">
            <div>
              <b>{c.fits}</b>
              <small>fits posted</small>
            </div>
            <div>
              <b className="gold">{c.daysLeft}d</b>
              <small>left</small>
            </div>
            <div>
              <b>{c.friendsIn}</b>
              <small>friends in</small>
            </div>
          </div>
        </div>
      </div>

      <div className="entries-head">
        <span className="k">Top entries</span>
        <span style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 600 }}>Sort: Trending</span>
      </div>

      {c.entries.length === 0 ? (
        <div className="empty">
          <p>No entries yet — post the first #{c.tag} fit.</p>
        </div>
      ) : (
        <div className="entries">
          {c.entries.map((e) => (
            <Link key={e.id} href={`/community/post/${e.id}`} className="entry">
              {e.media.kind === 'photo' ? (
                e.media.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.media.url} alt={e.caption || 'entry'} />
                ) : (
                  <div style={{ height: 170 }} />
                )
              ) : (
                <div className="lookwrap">
                  <LookCollage items={e.media.items} showLabels={false} size="sm" />
                </div>
              )}
              <span className="likes">
                <Heart />
                <span>{e.likeCount.toLocaleString()}</span>
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="pad" style={{ marginTop: 18 }}>
        <Link href={`/community/share?challenge=${c.id}`} className="btn">
          <Plus size={18} strokeWidth={2.2} /> Post your {c.tag} fit
        </Link>
      </div>
      <div style={{ height: 16 }} />
    </>
  )
}
