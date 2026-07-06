'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, Heart, Check, Loader2 } from 'lucide-react'
import { Spark } from '@/components/Spark'
import { Glyph, bucketFor } from '@/components/Glyph'
import { colorHex } from '@/lib/colors'
import { LookCollage } from './LookCollage'
import type { Look } from './types'
import { rateOutfit, markOutfitWorn } from '../actions'

export function LookDetail({
  look,
  occasion,
  onBack,
}: {
  look: Look
  occasion: string
  onBack: () => void
}) {
  const [worn, setWorn] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()
  const canAct = Boolean(look.id)

  const reasons =
    look.style_tips.length > 0
      ? look.style_tips
      : look.reasoning
          .split(/(?<=\.)\s+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 3)

  function wear() {
    if (!look.id || worn) return
    setWorn(true)
    startTransition(async () => {
      try {
        await markOutfitWorn(look.id!)
      } catch {
        setWorn(false)
      }
    })
  }

  function save() {
    if (!look.id || saved) return
    setSaved(true)
    startTransition(async () => {
      try {
        await rateOutfit(look.id!, 1)
      } catch {
        setSaved(false)
      }
    })
  }

  return (
    <>
      <div className="appbar" style={{ paddingBottom: 8 }}>
        <button className="iconbtn" onClick={onBack} aria-label="Back">
          <ChevronLeft size={18} strokeWidth={2.2} />
        </button>
        <button
          className={`iconbtn${saved ? ' on' : ''}`}
          onClick={save}
          disabled={!canAct || saved}
          aria-label="Save look"
          style={saved ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : undefined}
        >
          <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="pad">
        <div className="eyebrow">The look · {occasion}</div>
        <h1 className="h1" style={{ margin: '6px 0 16px' }}>
          {look.title || 'Your look'}
        </h1>
      </div>

      <div className="lookcard">
        <LookCollage items={look.items} showLabels={false} size="sm" />
      </div>

      <div className="why-card">
        <div className="hd">
          <Spark />
          <span>Why this works</span>
        </div>
        {reasons.map((r, i) => (
          <div className="why-row" key={i}>
            <span className="no">{String(i + 1).padStart(2, '0')}</span>
            <span>{r}</span>
          </div>
        ))}
      </div>

      <div className="today-label">
        {look.items.length} {look.items.length === 1 ? 'piece' : 'pieces'} from your closet
      </div>
      <div className="pieces-list">
        {look.items.map((it) => (
          <Link key={it.id} href={`/closet/${it.id}`} className="piece-row">
            <div className="th" style={{ background: it.imageUrl ? undefined : `${colorHex(it.colors)}55` }}>
              {it.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.imageUrl} alt={it.subcategory || it.category || 'piece'} />
              ) : (
                <Glyph category={it.category} subcategory={it.subcategory} color={colorHex(it.colors)} />
              )}
            </div>
            <div className="grow">
              <div className="nm">{it.subcategory || it.category || 'Piece'}</div>
              <div className="mt">{bucketFor(it.category, it.subcategory)}</div>
            </div>
            <div className="arw">
              <ChevronLeft size={16} strokeWidth={2} style={{ transform: 'rotate(180deg)' }} />
            </div>
          </Link>
        ))}
      </div>

      <div className="look-actions" style={{ marginTop: 18 }}>
        <button className="btn" onClick={wear} disabled={!canAct || worn}>
          {pending && !saved ? (
            <Loader2 size={18} className="animate-spin" />
          ) : worn ? (
            <>
              <Check size={18} strokeWidth={2.4} /> Logged for today
            </>
          ) : (
            'Wear this look'
          )}
        </button>
      </div>
      <div style={{ height: 10 }} />
    </>
  )
}
