'use client'

import { useRef, useState } from 'react'
import { ChevronLeft, X, Heart, Shuffle, Settings2, Loader2 } from 'lucide-react'
import { Spark } from '@/components/Spark'
import { LookCollage } from './LookCollage'
import { matchPct, type Look } from './types'

const THRESHOLD = 90

export function SwipeDeck({
  looks,
  loadingMore,
  onNeedMore,
  onReshuffle,
  onSave,
  onSkip,
  onOpen,
  onExit,
}: {
  looks: Look[]
  loadingMore: boolean
  onNeedMore: () => void
  onReshuffle: () => void
  onSave: (look: Look) => void
  /** Left-swipe. Optional so the guest deck can ignore it. */
  onSkip?: (look: Look) => void
  onOpen: (look: Look) => void
  onExit: () => void
}) {
  const [index, setIndex] = useState(0)
  const [dx, setDx] = useState(0)
  const [flung, setFlung] = useState<null | 'left' | 'right'>(null)
  const startX = useRef<number | null>(null)
  const moved = useRef(false)

  const remaining = looks.length - index
  const current = looks[index]
  const next = looks[index + 1]

  function commit(dir: 'left' | 'right') {
    if (flung) return
    setFlung(dir)
    if (dir === 'right' && current) onSave(current)
    // A left-swipe was previously discarded entirely — ~95% of the signal.
    if (dir === 'left' && current) onSkip?.(current)
    setTimeout(() => {
      setIndex((i) => i + 1)
      setDx(0)
      setFlung(null)
      // prefetch more looks before the deck runs dry
      if (looks.length - (index + 1) <= 1) onNeedMore()
    }, 220)
  }

  function onDown(e: React.PointerEvent) {
    if (flung) return
    startX.current = e.clientX
    moved.current = false
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  function onMove(e: React.PointerEvent) {
    if (startX.current === null || flung) return
    const d = e.clientX - startX.current
    if (Math.abs(d) > 4) moved.current = true
    setDx(d)
  }
  function onUp() {
    if (startX.current === null || flung) return
    startX.current = null
    if (dx > THRESHOLD) commit('right')
    else if (dx < -THRESHOLD) commit('left')
    else setDx(0)
  }

  const transform = flung
    ? `translateX(${flung === 'right' ? 620 : -620}px) rotate(${flung === 'right' ? 22 : -22}deg)`
    : `translateX(${dx}px) rotate(${dx / 22}deg)`

  return (
    <div className="deck-screen">
      <div className="deck-head">
        <button className="rnd" onClick={onExit} aria-label="Back">
          <ChevronLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="ttl">
          <b>Dress Me</b>
          <small>SHUFFLE · {Math.max(remaining, 0)} LEFT</small>
        </div>
        <button className="rnd" onClick={onReshuffle} aria-label="Reshuffle">
          <Settings2 size={18} strokeWidth={1.8} />
        </button>
      </div>

      {current ? (
        <>
          <div className="deck-stack">
            {next && <div className="deck-ghost" />}
            {next && <div className="deck-ghost two" />}
            <div
              className="card"
              style={{
                transform,
                transition: flung || startX.current === null ? 'transform .22s ease' : 'none',
              }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onClick={() => {
                if (!moved.current) onOpen(current)
              }}
            >
              <div className="stamp love" style={{ opacity: dx > 40 ? 1 : 0 }}>
                LOVE IT
              </div>
              <div className="stamp nope" style={{ opacity: dx < -40 ? 1 : 0 }}>
                NOPE
              </div>
              <div style={{ height: 'calc(100% - 56px)' }}>
                <LookCollage items={current.items} showLabels={false} />
              </div>
              <div className="meta">
                <div>
                  <div className="nm">{current.title || 'A fresh look'}</div>
                  <div className="sub">
                    {current.items
                      .map((i) => i.subcategory || i.category)
                      .filter(Boolean)
                      .slice(0, 3)
                      .join(' · ')}
                  </div>
                </div>
                {matchPct(current) != null && (
                  <div className="match">
                    <Spark />
                    <span>{matchPct(current)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="deck-btns">
            <button className="deckbtn skip" onClick={() => commit('left')} aria-label="Skip">
              <X size={22} strokeWidth={2.4} />
            </button>
            <button className="deckbtn shuffle" onClick={onReshuffle} aria-label="Reshuffle">
              {loadingMore ? <Loader2 size={24} className="animate-spin" /> : <Shuffle size={24} strokeWidth={2.2} />}
            </button>
            <button className="deckbtn save" onClick={() => commit('right')} aria-label="Save">
              <Heart size={24} fill="currentColor" />
            </button>
          </div>
          <p className="deck-hint">
            Swipe right to save · left to skip · tap <b>shuffle</b> to remix
          </p>
        </>
      ) : (
        <div className="deck-empty">
          {loadingMore ? (
            <>
              <Spark className="think-spark" />
              <p>Styling more looks…</p>
            </>
          ) : (
            <>
              <div className="h2 serif">That&apos;s the deck</div>
              <p>You&apos;ve been through every look. Reshuffle for a fresh set.</p>
              <button className="btn" style={{ maxWidth: 220 }} onClick={onReshuffle}>
                <Shuffle size={18} /> Reshuffle
              </button>
              <button
                className="btn btn--ghost"
                style={{ maxWidth: 220 }}
                onClick={onExit}
              >
                Back to stylist
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
