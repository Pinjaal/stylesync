'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X, Loader2, Check } from 'lucide-react'
import { Glyph } from '@/components/Glyph'
import { Spark } from '@/components/Spark'
import type { ItemDetailView } from '../[id]/data'
import { updateItem, CATEGORIES, OCCASIONS, SEASONS } from '../[id]/actions'

// Offer the vocabulary plus whatever the row already holds — real data can carry
// off-vocabulary values (the OpenRouter tagger falls back to category 'other'),
// and a <select> that omits the current value would silently corrupt it on save.
const withCurrent = (list: string[], current: string | null | undefined) =>
  current && !list.includes(current) ? [current, ...list] : list

/**
 * Desktop-only detail rail. Renders the same data as /closet/[id] (both go
 * through getItemDetail), fetched via /api/item/[id] on selection. Below 1024px
 * ClosetView never selects, so tiles navigate to the full page as before.
 */
export function ItemRail({ id, onClose }: { id: string; onClose: () => void }) {
  const router = useRouter()
  const [data, setData] = useState<ItemDetailView | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Draft edits, seeded from the fetch and diffed against it on save.
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [occasions, setOccasions] = useState<string[]>([])
  const [seasons, setSeasons] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [saving, startSave] = useTransition()

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(null)
    setSaveErr(null)
    setSaved(false)
    ;(async () => {
      try {
        const res = await fetch(`/api/item/${id}`)
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(json.error || 'Could not load this piece')
        const d = json as ItemDetailView
        setData(d)
        setName(d.item.name ?? '')
        setCategory(d.item.category ?? '')
        setOccasions(d.item.occasions ?? [])
        setSeasons(d.item.seasons ?? [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load this piece')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const dirty =
    !!data &&
    (name !== (data.item.name ?? '') ||
      category !== (data.item.category ?? '') ||
      occasions.join('|') !== (data.item.occasions ?? []).join('|') ||
      seasons.join('|') !== (data.item.seasons ?? []).join('|'))

  function save() {
    setSaveErr(null)
    startSave(async () => {
      try {
        await updateItem(id, { name, category, occasions, seasons })
        setSaved(true)
        setTimeout(() => setSaved(false), 1800)
        router.refresh() // grid label/bucket reflect the edit
      } catch (e) {
        setSaveErr(e instanceof Error ? e.message : 'Could not save')
      }
    })
  }

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
            <div className="rail-fields">
              <label className="rail-field">
                <span className="sec-t">Name</span>
                <input
                  value={name}
                  placeholder={data.item.subcategory || data.item.category || 'Piece'}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                />
              </label>
              <label className="rail-field">
                <span className="sec-t">Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {withCurrent(CATEGORIES, data.item.category).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

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

            {/* The mockup shows one undifferentiated "details" row, but its chips map to
                THREE columns (occasions[] / seasons[] / fit). A chip carries no field
                identity, so a single "add a detail" input can't know where to write —
                per-field groups instead. Documented deviation. */}
            <div className="sec-t">Occasions</div>
            <div className="attrs" style={{ margin: '0 0 16px' }}>
              {withCurrent(OCCASIONS, null).map((o) => (
                <button
                  key={o}
                  type="button"
                  className={`attr tog${occasions.includes(o) ? ' on' : ''}`}
                  onClick={() => toggle(occasions, setOccasions, o)}
                >
                  {o}
                </button>
              ))}
            </div>

            <div className="sec-t">Seasons</div>
            <div className="attrs" style={{ margin: '0 0 18px' }}>
              {withCurrent(SEASONS, null).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`attr tog${seasons.includes(s) ? ' on' : ''}`}
                  onClick={() => toggle(seasons, setSeasons, s)}
                >
                  {s}
                </button>
              ))}
            </div>

            {saveErr && <p className="alert" style={{ margin: '0 0 12px' }}>{saveErr}</p>}

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
            {dirty || saving || saved ? (
              <button className="btn" onClick={save} disabled={saving || !dirty}>
                {saving ? (
                  <>
                    <Loader2 size={17} className="animate-spin" /> Saving…
                  </>
                ) : saved ? (
                  <>
                    <Check size={17} strokeWidth={2.4} /> Saved
                  </>
                ) : (
                  'Save changes'
                )}
              </button>
            ) : (
              <>
                <Link href={`/closet/${data.item.id}`} className="btn btn--ghost">
                  Open
                </Link>
                <Link href="/outfit" className="btn">
                  <Spark /> Style this piece
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
