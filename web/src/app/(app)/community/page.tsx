import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PlusSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getActiveChallenge, getStories, getFeed, type ActiveChallenge, type Story, type FeedPost } from './data'
import { PostCard } from './_components/PostCard'

export const dynamic = 'force-dynamic'

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

export default async function CommunityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [challenge, stories, feed] = await Promise.all([
    safe<ActiveChallenge | null>(() => getActiveChallenge(supabase), null),
    safe<Story[]>(() => getStories(supabase), []),
    safe<FeedPost[]>(() => getFeed(supabase, user.id), []),
  ])

  return (
    <>
      <div className="appbar" style={{ alignItems: 'center' }}>
        <div className="title" style={{ fontSize: 30 }}>
          Community
        </div>
        <Link href="/community/share" className="iconbtn" aria-label="Share your fit">
          <PlusSquare />
        </Link>
      </div>

      {challenge && (
        <Link
          href={`/community/challenge/${challenge.id}`}
          className="challenge-banner"
          style={{ background: `linear-gradient(115deg, ${challenge.grad.split(',')[0]}, ${challenge.grad.split(',')[1]})` }}
        >
          <div className="blob" />
          <div className="inner">
            <div className="k">This week&apos;s challenge</div>
            <div className="ct">#{challenge.tag}</div>
            <div className="row">
              <span>
                {challenge.fits} fits · {challenge.daysLeft} days left
              </span>
              <span className="join">Join</span>
            </div>
          </div>
        </Link>
      )}

      <div className="stories">
        <Link href="/community/share" className="story">
          <div className="story-ring add">
            <div className="story-av add">＋</div>
          </div>
          <span className="story-name">Your fit</span>
        </Link>
        {stories.map((s) => (
          <Link href={`/community/post`} key={s.id} className="story" style={{ pointerEvents: 'none' }}>
            <div className="story-ring">
              <div className="story-av" style={{ background: s.bg, color: s.color }}>
                {s.initial}
              </div>
            </div>
            <span className="story-name">{s.name.toLowerCase().replace(/\s+/g, '.')}</span>
          </Link>
        ))}
      </div>

      {feed.length === 0 ? (
        <div className="empty" style={{ marginTop: 8 }}>
          <div className="h2 serif">No fits yet</div>
          <p>Be the first — share a look you logged with Spark.</p>
          <Link href="/community/share" className="btn" style={{ maxWidth: 220, margin: '16px auto 0' }}>
            Share your fit
          </Link>
        </div>
      ) : (
        feed.map((post) => <PostCard key={post.id} post={post} />)
      )}

      <div style={{ height: 20 }} />
    </>
  )
}
