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
function deckFor(occasion: string): Look[] {
  const first = (DEMO_LOOKS[occasion] ?? []).map(toLook)
  const rest = shuffle(allDemoLooks().map(toLook))
  return [...first, ...rest]
}

export function GuestStyle() {
  const [view, setView] = useState<'home' | 'deck'>('home')
  const [occasion, setOccasion] = useState<string>('Casual')
  const [looks, setLooks] = useState<Look[]>([])
  const [prompt, setPrompt] = useState<{ open: boolean; title?: string; message?: string }>({
    open: false,
  })

  function styleMe() {
    setLooks(deckFor(occasion))
    setView('deck')
  }

  if (view === 'deck') {
    return (
      <>
        <SwipeDeck
          looks={looks}
          loadingMore={false}
          onNeedMore={() => setLooks((l) => [...l, ...shuffle(allDemoLooks().map(toLook))])}
          onReshuffle={() => setLooks(deckFor(occasion))}
          onSave={() =>
            setPrompt({
              open: true,
              title: 'Log in to save looks',
              message: 'Sign up to save the outfits you love and get them on your own clothes.',
            })
          }
          onOpen={() =>
            setPrompt({
              open: true,
              title: 'Log in for the full look',
              message: 'Create a free account to see the breakdown and style your own wardrobe.',
            })
          }
          onExit={() => setView('home')}
        />
        <LoginPrompt open={prompt.open} onClose={() => setPrompt({ open: false })} title={prompt.title} message={prompt.message} />
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

      {/* locked "today's look" — login to reveal */}
      <div className="today-label">Today&apos;s look</div>
      <div className="lookcard" style={{ textAlign: 'center', padding: '32px 22px' }}>
        <div
          style={{
            width: 52, height: 52, borderRadius: 16, background: 'var(--accent-tint)',
            color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          }}
        >
          <Lock size={22} />
        </div>
        <div className="think-t">Your look for today</div>
        <p className="dim" style={{ fontSize: 14, margin: '4px 0 0' }}>
          Log in to see the outfit Spark picked for you.
        </p>
        <Link href="/login" className="btn" style={{ maxWidth: 240, margin: '14px auto 0' }}>
          Log in to reveal
        </Link>
      </div>

      {/* Style me — works for guests on the demo closet */}
      <div className="pad">
        <div className="qlabel">The occasion</div>
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
      <div style={{ height: 16 }} />

      <LoginPrompt open={prompt.open} onClose={() => setPrompt({ open: false })} title={prompt.title} message={prompt.message} />
    </>
  )
}
