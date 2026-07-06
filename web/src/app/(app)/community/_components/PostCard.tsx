'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, Bookmark } from 'lucide-react'
import { LookCollage } from '@/app/(app)/outfit/_components/LookCollage'
import { toggleLike, toggleFollow } from '../actions'
import type { FeedPost } from '../data'

export function PostMedia({ post }: { post: FeedPost }) {
  return (
    <div className="post-media">
      {post.challengeTag && <span className="tag">#{post.challengeTag}</span>}
      {post.media.kind === 'photo' ? (
        post.media.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.media.url} alt={post.caption || 'outfit'} />
        ) : (
          <div style={{ height: 320 }} />
        )
      ) : (
        <div className="lookwrap">
          <LookCollage items={post.media.items} showLabels={false} />
        </div>
      )}
    </div>
  )
}

export function Caption({ post }: { post: FeedPost }) {
  const parts = (post.caption ?? '').split(/(#\w+)/g)
  return (
    <p className="post-cap">
      <b>{post.author.name.toLowerCase().replace(/\s+/g, '.')}</b>{' '}
      {parts.map((p, i) =>
        p.startsWith('#') ? (
          <span className="hash" key={i}>
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  )
}

export function FollowButton({
  targetId,
  initiallyFollowing,
}: {
  targetId: string
  initiallyFollowing: boolean
}) {
  const [following, setFollowing] = useState(initiallyFollowing)
  const [, start] = useTransition()
  return (
    <button
      className={`follow-btn${following ? ' on' : ''}`}
      onClick={() => {
        setFollowing((v) => !v)
        start(async () => {
          try {
            const now = await toggleFollow(targetId)
            setFollowing(now)
          } catch {
            setFollowing((v) => !v)
          }
        })
      }}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  )
}

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
}: {
  postId: string
  initialLiked: boolean
  initialCount: number
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [, start] = useTransition()

  function onClick() {
    const next = !liked
    setLiked(next)
    setCount((c) => c + (next ? 1 : -1))
    start(async () => {
      try {
        await toggleLike(postId)
      } catch {
        setLiked(!next)
        setCount((c) => c + (next ? -1 : 1))
      }
    })
  }

  return (
    <button className={`pa like${liked ? ' on' : ''}`} onClick={onClick} aria-label="Like">
      <Heart fill={liked ? 'currentColor' : 'none'} />
      <span>{count.toLocaleString()}</span>
    </button>
  )
}

export function PostCard({ post }: { post: FeedPost }) {
  return (
    <article className="post">
      <div className="post-head">
        <div className="cav" style={{ background: post.author.avatarBg, color: post.author.avatarColor }}>
          {post.author.initial}
        </div>
        <div className="who">
          <div className="nm">
            {post.author.name.toLowerCase().replace(/\s+/g, '.')}{' '}
            <span className="t">· {post.createdLabel}</span>
          </div>
          <div className="sub">
            {[post.author.location, post.author.styleLabel].filter(Boolean).join(' · ')}
          </div>
        </div>
        {!post.author.isMe && (
          <FollowButton targetId={post.author.id} initiallyFollowing={post.author.isFollowing} />
        )}
      </div>

      <Link href={`/community/post/${post.id}`} style={{ display: 'block' }}>
        <PostMedia post={post} />
      </Link>

      <div className="post-actions">
        <LikeButton postId={post.id} initialLiked={post.likedByMe} initialCount={post.likeCount} />
        <Link href={`/community/post/${post.id}`} className="pa">
          <MessageCircle />
          <span>{post.commentCount}</span>
        </Link>
        <span className="pa grow" />
        <button className="pa" aria-label="Save">
          <Bookmark />
        </button>
      </div>

      <Link href={`/community/post/${post.id}`} style={{ display: 'block', textDecoration: 'none' }}>
        <Caption post={post} />
      </Link>
    </article>
  )
}
