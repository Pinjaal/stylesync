'use client'

import { useState } from 'react'
import { Heart, MessageCircle, Bookmark } from 'lucide-react'
import { LoginPrompt } from '@/components/LoginPrompt'
import { LookCollage } from '@/app/(app)/outfit/_components/LookCollage'
import { DEMO_POSTS, demoItems } from '@/lib/demo'

export function GuestCommunity() {
  const [prompt, setPrompt] = useState(false)
  const gate = () => setPrompt(true)

  return (
    <>
      <div className="appbar" style={{ alignItems: 'center' }}>
        <div className="title" style={{ fontSize: 30 }}>
          Community
        </div>
      </div>

      {/* challenge banner */}
      <div
        className="challenge-banner"
        style={{ background: 'linear-gradient(115deg, #4A6480, #2C3E50)' }}
      >
        <div className="blob" />
        <div className="inner">
          <div className="k">This week&apos;s challenge</div>
          <div className="ct">#DenimWeek</div>
          <div className="row">
            <span>846 fits · 3 days left</span>
            <button className="join" onClick={gate}>
              Join
            </button>
          </div>
        </div>
      </div>

      {DEMO_POSTS.map((p) => (
        <article className="post" key={p.id}>
          <div className="post-head">
            <div className="cav" style={{ background: p.bg, color: p.color }}>
              {p.initial}
            </div>
            <div className="who">
              <div className="nm">
                {p.name.toLowerCase().replace(/\s+/g, '.')} <span className="t">· {p.timeLabel}</span>
              </div>
              <div className="sub">
                {p.location} · {p.style}
              </div>
            </div>
            <button className="follow-btn" onClick={gate}>
              Follow
            </button>
          </div>

          <div className="post-media" onClick={gate}>
            {p.challengeTag && <span className="tag">#{p.challengeTag}</span>}
            <div className="lookwrap">
              <LookCollage items={demoItems(p.itemIds)} showLabels={false} />
            </div>
          </div>

          <div className="post-actions">
            <button className="pa like" onClick={gate} aria-label="Like">
              <Heart />
              <span>{p.likeCount.toLocaleString()}</span>
            </button>
            <button className="pa" onClick={gate}>
              <MessageCircle />
              <span>{p.commentCount}</span>
            </button>
            <span className="pa grow" />
            <button className="pa" onClick={gate} aria-label="Save">
              <Bookmark />
            </button>
          </div>

          <p className="post-cap">
            <b>{p.name.toLowerCase().replace(/\s+/g, '.')}</b> {p.caption}
          </p>
        </article>
      ))}

      <div style={{ height: 20 }} />

      <LoginPrompt
        open={prompt}
        onClose={() => setPrompt(false)}
        title="Log in to join the community"
        message="Sign up to like, comment, follow, and share your own fits."
      />
    </>
  )
}
