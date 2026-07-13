'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Spark } from '@/components/Spark'
import { LoginPrompt } from '@/components/LoginPrompt'
import { SwipeDeck } from '@/app/(app)/outfit/_components/SwipeDeck'
import type { Look } from '@/app/(app)/outfit/_components/types'
import { OCCASIONS } from '@/lib/demo'

// Guest styling is LLM-only — it composes looks from the demo closet via
// /api/guest-recommend. No static preset fallback: if the model can't respond
// we surface a retry rather than serving canned outfits.
async function llmLooks(occasion: string, styleQuery: string): Promise<Look[]> {
  const res = await fetch('/api/guest-recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ occasion: occasion.toLowerCase(), styleQuery: styleQuery || undefined }),
  })
  const data = await res.json()
  if (!res.ok || !data.outfits?.length) throw new Error(data.error || 'no looks')
  return data.outfits as Look[]
}

export function GuestStyle() {
  const [view, setView] = useState<'home' | 'deck'>('home')
  const [occasion, setOccasion] = useState<string>('Casual')
  const [prompt, setPrompt] = useState('')
  const [looks, setLooks] = useState<Look[]>([])
  const [thinking, setThinking] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const [gate, setGate] = useState<{ open: boolean; title?: string; message?: string }>({ open: false })

  async function styleMe() {
    setThinking(true)
    setError(null)
    try {
      const got = await llmLooks(occasion, prompt.trim())
      setLooks(got)
      setView('deck')
      const n = count + 1
      setCount(n)
      if (n === 3) {
        setGate({
          open: true,
          title: 'Enjoying Spark?',
          message: 'Sign up for unlimited styling on the clothes you actually own — it’s free.',
        })
      }
    } catch {
      setError('Spark couldn’t style a look right now. Please try again in a moment.')
    } finally {
      setThinking(false)
    }
  }

  // Top up the deck by asking the LLM for more looks — never inject presets.
  async function needMore() {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      const more = await llmLooks(occasion, prompt.trim())
      setLooks((l) => [...l, ...more])
    } catch {
      /* LLM unavailable — stop rather than pad with canned looks */
    } finally {
      setLoadingMore(false)
    }
  }

  if (view === 'deck') {
    return (
      <>
        <SwipeDeck
          looks={looks}
          loadingMore={loadingMore}
          onNeedMore={needMore}
          onReshuffle={() => styleMe()}
          onSave={() =>
            setGate({ open: true, title: 'Log in to save looks', message: 'Sign up to save outfits you love.' })
          }
          onOpen={() =>
            setGate({ open: true, title: 'Log in for the full look', message: 'Create a free account to style your own wardrobe.' })
          }
          onExit={() => setView('home')}
        />
        <LoginPrompt open={gate.open} onClose={() => setGate({ open: false })} title={gate.title} message={gate.message} />
      </>
    )
  }

  return (
    <>
      <div className="appbar">
        <div>
          <div className="title">Get Styled</div>
          <div className="sub">Spark builds looks from the closet</div>
        </div>
      </div>

      {/* locked "today's look" */}
      <div className="today-label">Today&apos;s look</div>
      <div className="lookcard" style={{ textAlign: 'center', padding: '28px 22px' }}>
        <div
          style={{
            width: 48, height: 48, borderRadius: 15, background: 'var(--accent-tint)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
          }}
        >
          <Lock size={20} />
        </div>
        <div className="think-t">Your look for today</div>
        <p className="dim" style={{ fontSize: 14, margin: '4px 0 0' }}>
          Log in to see the outfit Spark picked for you.
        </p>
        <Link href="/login" className="btn" style={{ maxWidth: 230, margin: '12px auto 0' }}>
          Log in to reveal
        </Link>
      </div>

      {thinking ? (
        <div className="thinking">
          <Spark className="think-spark" />
          <div className="think-t">Spark is styling…</div>
          <div className="think-d">Reading the closet &amp; your request</div>
        </div>
      ) : (
        <div className="pad">
          <h2 className="ask-title" style={{ margin: '18px 0 12px', fontSize: 24 }}>
            What&apos;s the <em>occasion?</em>
          </h2>
          <div className="ask-input">
            <input
              placeholder="Rooftop dinner, 8pm — a little dressy…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && styleMe()}
            />
          </div>

          <div className="today-label" style={{ margin: '2px 0 9px' }}>
            Or tap a quick one
          </div>
          <div className="pillwrap">
            {OCCASIONS.map((o) => (
              <button key={o} className={`pill${occasion === o ? ' on' : ''}`} onClick={() => setOccasion(o)}>
                {o}
              </button>
            ))}
          </div>

          <button className="btn style-cta" onClick={styleMe}>
            <Spark /> Style me
          </button>
          {error && (
            <p className="tiny" style={{ textAlign: 'center', marginTop: 10, color: 'var(--accent)' }}>
              {error}
            </p>
          )}
          <p className="tiny dim" style={{ textAlign: 'center', marginTop: 10 }}>
            Swipe right to save · left to skip
          </p>
        </div>
      )}
      <div style={{ height: 16 }} />

      <LoginPrompt open={gate.open} onClose={() => setGate({ open: false })} title={gate.title} message={gate.message} />
    </>
  )
}
