import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Heart, Check } from 'lucide-react'
import { Glyph } from '@/components/Glyph'
import { ItemActions } from './_components/ItemActions'
import { getItemDetail } from './data'

export const dynamic = 'force-dynamic'

export default async function ItemDetailPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ added?: string }>
}) {
  const { id } = await props.params
  const { added } = await props.searchParams

  // Same query path the desktop rail uses (api/item/[id]).
  const detail = await getItemDetail(id)
  if (!detail) notFound()
  const { item, title, eyebrow, heroUrl, heroColor, lastWorn, inLooks, attrs, pairs } = detail

  return (
    <>
      <div className="idhero" style={{ background: `linear-gradient(160deg, ${heroColor}33, ${heroColor}55)` }}>
        <Link href="/closet" className="top-btn" style={{ left: 20 }} aria-label="Back">
          <ChevronLeft size={20} strokeWidth={2.2} />
        </Link>
        <div className="top-btn" style={{ right: 20 }} aria-hidden>
          <Heart size={18} />
        </div>
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroUrl} alt={item.description || title} />
        ) : (
          <div className="glyphwrap">
            <Glyph category={item.category} subcategory={item.subcategory} color={heroColor} />
          </div>
        )}
        <div className="worn-badge">WORN {item.times_worn ?? 0}×</div>
      </div>

      {added && (
        <div className="add-banner">
          <Check size={18} strokeWidth={2.4} />
          <span>Background removed · tagged by AI — tweak anything that&apos;s off below.</span>
        </div>
      )}

      <div className="idsheet">
        <div className="eyebrow" style={{ color: 'var(--ink-mute)', marginBottom: 6 }}>
          {eyebrow}
        </div>
        <h1 className="h1" style={{ textTransform: 'capitalize' }}>
          {title}
        </h1>

        {attrs.length > 0 && (
          <div className="attrs">
            {attrs.map((a, i) => (
              <span className="attr" key={i}>
                {a.dot && <span className="dot" style={{ background: a.dot }} />}
                {a.label}
              </span>
            ))}
          </div>
        )}

        <div className="idstats">
          <div className="idstat">
            <b>{item.times_worn ?? 0}×</b>
            <small>worn</small>
          </div>
          <div className="idstat">
            <b>{lastWorn}</b>
            <small>last worn</small>
          </div>
          <div className="idstat">
            <b>{inLooks}</b>
            <small>in looks</small>
          </div>
        </div>

        {pairs.length > 0 && (
          <>
            <div className="sec-t">Styles beautifully with</div>
            <div className="pairs">
              {pairs.map((p) => (
                <Link key={p.id} href={`/closet/${p.id}`} className="pair">
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

      <ItemActions itemId={item.id} />
    </>
  )
}
