'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Check, Plus, Loader2 } from 'lucide-react'
import { Glyph } from '@/components/Glyph'
import { createSegment, type SegmentSummary } from '../segments-actions'

export interface ClosetItem {
  id: string
  label: string
  category: string | null
  subcategory: string | null
  bucket: string
  color: string
  timesWorn: number
  imageUrl: string | null
}

const ORDER = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Bags', 'Other']
const HEIGHTS = [150, 158, 172, 186, 200, 214, 238]
const SEG_COLORS = ['#EE4127', '#F4C64E', '#C9B6F0', '#7FA98C', '#17120E']

// Stable pseudo-random tile height for the editorial masonry.
function tileHeight(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff
  return HEIGHTS[h % HEIGHTS.length]
}

export function ClosetView({
  items,
  segments,
  stats,
  error,
}: {
  items: ClosetItem[]
  segments: SegmentSummary[]
  stats: { pieces: number; looks: number; wornPct: number }
  error: string | null
}) {
  const router = useRouter()
  const [active, setActive] = useState('All')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const buckets = useMemo(() => {
    const counts = new Map<string, number>()
    for (const it of items) counts.set(it.bucket, (counts.get(it.bucket) ?? 0) + 1)
    return ORDER.filter((b) => counts.has(b)).map((b) => ({ label: b, n: counts.get(b)! }))
  }, [items])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = items
    if (active.startsWith('seg:')) {
      const seg = segments.find((s) => s.id === active.slice(4))
      const ids = new Set(seg?.itemIds ?? [])
      list = items.filter((it) => ids.has(it.id))
    } else if (active !== 'All') {
      list = items.filter((it) => it.bucket === active)
    }
    if (q) list = list.filter((it) => `${it.label} ${it.category ?? ''}`.toLowerCase().includes(q))
    return list
  }, [items, segments, active, query])

  return (
    <>
      <div className="appbar">
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            Your closet
          </div>
          <div className="title">The Wardrobe</div>
        </div>
        <button
          className="iconbtn"
          onClick={() => setSearchOpen((v) => !v)}
          aria-label="Search closet"
        >
          <Search />
        </button>
      </div>

      <div className="wstats">
        <span className="wstats-item">
          <b>{stats.pieces}</b> pieces
        </span>
        <span className="wstats-item">
          <b>{stats.looks}</b> looks
        </span>
        <span className="wstats-item">
          <b>{stats.wornPct}%</b> worn this month
        </span>
      </div>

      {searchOpen && (
        <div className="search-bar">
          <Search />
          <input
            autoFocus
            placeholder="Search your closet…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      <div className="chiprow">
        <button
          className={`chip${active === 'All' ? ' on' : ''}`}
          onClick={() => setActive('All')}
        >
          All <span className="n">{stats.pieces}</span>
        </button>
        {buckets.map((b) => (
          <button
            key={b.label}
            className={`chip${active === b.label ? ' on' : ''}`}
            onClick={() => setActive(b.label)}
          >
            {b.label} <span className="n">{b.n}</span>
          </button>
        ))}
        {segments.map((s) => (
          <button
            key={s.id}
            className={`chip seg${active === `seg:${s.id}` ? ' on' : ''}`}
            onClick={() => setActive(`seg:${s.id}`)}
          >
            <span className="dot" style={{ background: s.color }} />
            {s.name} <span className="n">{s.itemIds.length}</span>
          </button>
        ))}
        <button className="chip add" onClick={() => setSheetOpen(true)}>
          ＋ Segment
        </button>
      </div>

      {error && (
        <div style={{ padding: '0 22px' }}>
          <p className="alert">Couldn&apos;t load your closet: {error}</p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty">
          <div className="h2">Your closet is empty</div>
          <p>Tap the ＋ button below to add your first piece — AI tags it for you.</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <p>Nothing here yet. Try another filter or add a piece.</p>
        </div>
      ) : (
        <div className="masonry">
          {shown.map((it) => (
            <Link
              key={it.id}
              href={`/closet/${it.id}`}
              className="mtile"
              style={{ height: it.imageUrl ? undefined : tileHeight(it.id), background: it.imageUrl ? undefined : `${it.color}33` }}
            >
              {it.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.imageUrl} alt={it.label} style={{ height: tileHeight(it.id) }} />
              ) : (
                <div className="glyphwrap">
                  <Glyph category={it.category} subcategory={it.subcategory} color={it.color} />
                </div>
              )}
              {it.timesWorn > 0 && <div className="mbadge">{it.timesWorn}×</div>}
              <div className="mlabel">
                <span className="dot" style={{ background: it.color }} />
                <span className="nm">{it.label}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div style={{ height: 22 }} />

      {sheetOpen && (
        <CreateSegmentSheet
          items={items}
          onClose={() => setSheetOpen(false)}
          onCreated={() => {
            setSheetOpen(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

function CreateSegmentSheet({
  items,
  onClose,
  onCreated,
}: {
  items: ClosetItem[]
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(SEG_COLORS[0])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggle(id: string) {
    setPicked((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      try {
        await createSegment(name, color, [...picked])
        onCreated()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not create segment')
      }
    })
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        <h2>New segment</h2>
        <p className="lead">Group pieces however your brain works.</p>

        <input
          className="sheet-input"
          placeholder="Rooftop dinner"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <div className="sheet-label">Tag colour</div>
        <div className="swatch-row">
          {SEG_COLORS.map((c) => (
            <button
              key={c}
              className={color === c ? 'on' : ''}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Colour ${c}`}
            />
          ))}
        </div>

        <div className="sheet-label">
          <span>Add pieces · {picked.size}</span>
        </div>
        {items.length === 0 ? (
          <p className="lead">Add pieces to your closet first.</p>
        ) : (
          <div className="pick-row">
            {items.map((it) => {
              const on = picked.has(it.id)
              return (
                <button
                  key={it.id}
                  className={`pick${on ? '' : ' off'}`}
                  style={{ background: it.imageUrl ? undefined : `${it.color}55` }}
                  onClick={() => toggle(it.id)}
                  aria-label={it.label}
                >
                  {it.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.imageUrl} alt={it.label} />
                  ) : (
                    <div className="glyphwrap">
                      <Glyph category={it.category} subcategory={it.subcategory} color={it.color} />
                    </div>
                  )}
                  <span className="tick">
                    <Check strokeWidth={3} />
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {error && <p className="alert">{error}</p>}

        <button className="btn" onClick={submit} disabled={pending || !name.trim()}>
          {pending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={2.5} />}
          Create segment
        </button>
      </div>
    </div>
  )
}
