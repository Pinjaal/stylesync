'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Spark } from '@/components/Spark'
import { LoginPrompt } from '@/components/LoginPrompt'
import { SwipeDeck } from '@/app/(app)/outfit/_components/SwipeDeck'
import type { Look } from '@/app/(app)/outfit/_components/types'
import { DEMO_LOOKS, OCCASIONS, allDemoLooks, demoItems, type DemoLook } from '@/lib/demo'

function toLook(d: DemoLook): Look {
  return {
    id: null,
    title: d.title,
    reasoning: d.reasoning,
    style_tips: d.tips,
    confidence: d.match / 100,
    items: demoItems(d.itemIds),
  }
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
// Preset fallback if the LLM is unavailable.
function presetDeck(occasion: string): Look[] {
  const first = (DEMO_LOOKS[occasion] ?? []).map(toLook)
  return [...first, ...shuffle(allDemoLooks().map(toLook))]
}

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
  const [count, setCount] = useState(0)
  const [gate, setGate] = useState<{ open: boolean; title?: string; message?: string }>({ open: false })

  async function styleMe() {
    setThinking(true)
    let got: Look[]
    try {
      got = await llmLooks(occasion, prompt.trim())
    } catch {
      got = presetDeck(occasion) // LLM unavailable → curated fallback
    }
    setLooks(got)
    setThinking(false)
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
  }

  if (view === 'deck') {
    return (
      <>
        <SwipeDeck
          looks={looks}
          loadingMore={false}
          onNeedMore={() => setLooks((l) => [...l, ...shuffle(allDemoLooks().map(toLook))])}
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
