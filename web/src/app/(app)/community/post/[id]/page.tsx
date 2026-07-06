import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft, ShoppingBag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Glyph } from '@/components/Glyph'
import { getPost } from '../../data'
import { initialOf } from '@/lib/avatar'
import {
  PostMedia,
  Caption,
  LikeButton,
  FollowButton,
} from '../../_components/PostCard'
import { CommentBar } from '../../_components/CommentBar'
import { MessageCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PostDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const detail = await getPost(supabase, user.id, id).catch(() => null)
  if (!detail) notFound()
  const { post, comments, shopItems } = detail

  const { data: me } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()
  const myInitial = initialOf(me?.display_name)

  return (
    <>
      <div className="appbar" style={{ alignItems: 'center', gap: 10 }}>
        <Link href="/community" className="iconbtn" aria-label="Back">
          <ChevronLeft size={18} strokeWidth={2.2} />
        </Link>
        <div className="cav" style={{ width: 36, height: 36, fontSize: 16, background: post.author.avatarBg, color: post.author.avatarColor }}>
          {post.author.initial}
        </div>
        <div className="who" style={{ flex: 1 }}>
          <div className="nm" style={{ fontSize: 14, fontWeight: 600 }}>
            {post.author.name.toLowerCase().replace(/\s+/g, '.')}
          </div>
          <div className="sub" style={{ fontSize: 11.5, color: 'var(--ink-mute)' }}>
            {[post.author.location, post.author.styleLabel].filter(Boolean).join(' · ')}
          </div>
        </div>
        {!post.author.isMe && (
          <span style={{ background: 'var(--accent)', borderRadius: 99, padding: '6px 2px' }}>
            <span style={{ padding: '0 12px' }}>
              <FollowButton targetId={post.author.id} initiallyFollowing={post.author.isFollowing} />
            </span>
          </span>
        )}
      </div>

      <div className="pd-media">
        <PostMedia post={post} />
      </div>

      <div className="pad">
        <div className="post-actions" style={{ marginTop: 0 }}>
          <LikeButton postId={post.id} initialLiked={post.likedByMe} initialCount={post.likeCount} />
          <span className="pa">
            <MessageCircle />
            <span>{post.commentCount}</span>
          </span>
        </div>
        <Caption post={post} />
      </div>

      {shopItems.length > 0 && (
        <div className="shop">
          <div className="hd">
            <ShoppingBag />
            <span>Get the look — {shopItems.length} similar in your closet</span>
          </div>
          <div className="row">
            {shopItems.map((it) => (
              <Link key={it.id} href={`/closet/${it.id}`} style={{ background: it.url ? undefined : `${it.color}44` }}>
                {it.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.url} alt={it.label} />
                ) : (
                  <Glyph category={it.category} subcategory={it.subcategory} color={it.color} />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="today-label" style={{ margin: '0 22px 12px' }}>
        {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
      </div>
      {comments.length === 0 ? (
        <p className="pad tiny dim" style={{ marginBottom: 12 }}>
          No comments yet — say something nice.
        </p>
      ) : (
        <div className="comments">
          {comments.map((c) => (
            <div className="comment" key={c.id}>
              <div className="cav" style={{ background: c.bg, color: c.color }}>
                {c.initial}
              </div>
              <div>
                <div className="body">
                  <b>{c.authorName.toLowerCase().replace(/\s+/g, '.')}</b> {c.body}
                </div>
                <div className="meta">{c.timeLabel} · Reply</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 16 }} />
      <CommentBar postId={post.id} myInitial={myInitial} />
    </>
  )
}
