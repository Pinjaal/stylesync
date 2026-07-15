'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Loader2 } from 'lucide-react'
import { Glyph } from '@/components/Glyph'
import { Spark } from '@/components/Spark'
import type { ItemDetailView } from '../[id]/data'

/**
 * Desktop-only detail rail. Renders the same data as /closet/[id] (both go
 * through getItemDetail), fetched via /api/item/[id] on selection. Below 1024px
 * ClosetView never selects, so tiles navigate to the full page as before.
 */
export function ItemRail({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<ItemDetailView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch(`/api/item/${id}`)
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(json.error || 'Could not load this piece')
        setData(json as ItemDetailView)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load this piece')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <aside className="itemrail">
      <button className="rail-x" onClick={onClose} aria-label="Close">
        <X size={16} strokeWidth={2.2} />
      </button>

      {!data && !error && (
        <div className="rail-load">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}
      {error && <p className="alert" style={{ margin: 22 }}>{error}</p>}

      {data && (
        <>
          <div
            className="rail-hero"
            style={{ background: `linear-gradient(160deg, ${data.heroColor}33, ${data.heroColor}55)` }}
          >
            {data.heroUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.heroUrl} alt={data.item.description || data.title} />
            ) : (
              <div className="glyphwrap">
                <Glyph
                  category={data.item.category}
                  subcategory={data.item.subcategory}
                  color={data.heroColor}
                />
              </div>
            )}
            <span className="rail-tag">{data.item.category ?? 'Piece'}</span>
          </div>

          <div className="rail-body">
            <div className="eyebrow" style={{ color: 'var(--ink-mute)', marginBottom: 5 }}>
              {data.eyebrow}
            </div>
            <h2 className="h2" style={{ textTransform: 'capitalize', margin: '0 0 14px' }}>
              {data.title}
            </h2>

            {data.attrs.length > 0 && (
              <div className="attrs" style={{ margin: '0 0 18px' }}>
                {data.attrs.map((a, i) => (
                  <span className="attr" key={i}>
                    {a.dot && <span className="dot" style={{ background: a.dot }} />}
                    {a.label}
                  </span>
                ))}
              </div>
            )}

            <div className="idstats">
              <div className="idstat">
                <b>{data.item.times_worn ?? 0}</b>
                <small>times worn</small>
              </div>
              <div className="idstat">
                <b>{data.lastWorn}</b>
                <small>last worn</small>
              </div>
              <div className="idstat">
                <b>{data.inLooks}</b>
                <small>in looks</small>
              </div>
            </div>

            {data.pairs.length > 0 && (
              <>
                <div className="sec-t">Styles beautifully with</div>
                <div className="rail-pairs">
                  {data.pairs.slice(0, 3).map((p) => (
                    <Link key={p.id} href={`/closet/${p.id}`} className="rail-pair">
                      <div className="ph" style={{ background: p.imageUrl ? undefined : `${p.color}44` }}>
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt={p.label} />
                        ) : (
                          <Glyph category={null} subcategory={p.label} color={p.color} />
                        )}
                      </div>
                      <div className="nm">{p.label}</div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rail-foot">
            <Link href={`/closet/${data.item.id}`} className="btn btn--ghost">
              Open full page
            </Link>
            <Link href="/outfit" className="btn">
              <Spark /> Style this piece
            </Link>
          </div>
        </>
      )}
    </aside>
  )
}
