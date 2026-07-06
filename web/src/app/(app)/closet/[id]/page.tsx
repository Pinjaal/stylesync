import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Heart, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrls } from '@/lib/storage'
import { Glyph, bucketFor } from '@/components/Glyph'
import { colorHex } from '@/lib/colors'
import { ItemActions } from './_components/ItemActions'

export const dynamic = 'force-dynamic'

interface ItemDetail {
  id: string
  cleaned_image_key: string | null
  category: string | null
  subcategory: string | null
  colors: string[] | null
  pattern: string | null
  fabric: string | null
  fit: string | null
  occasions: string[] | null
  seasons: string[] | null
  description: string | null
  times_worn: number | null
  last_worn_at: string | null
}

interface PairRow {
  id: string
  cleaned_image_key: string | null
  category: string | null
  subcategory: string | null
  colors: string[] | null
}

// Which buckets pair nicely with a given one, best first.
const PAIR_MAP: Record<string, string[]> = {
  Tops: ['Bottoms', 'Outerwear', 'Shoes'],
  Bottoms: ['Tops', 'Shoes', 'Outerwear'],
  Dresses: ['Outerwear', 'Shoes', 'Bags'],
  Outerwear: ['Tops', 'Bottoms', 'Shoes'],
  Shoes: ['Bottoms', 'Tops', 'Dresses'],
  Bags: ['Dresses', 'Tops', 'Shoes'],
  Other: ['Tops', 'Bottoms', 'Shoes'],
}

export default async function ItemDetailPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ added?: string }>
}) {
  const { id } = await props.params
  const { added } = await props.searchParams
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('items')
    .select(
      'id, cleaned_image_key, category, subcategory, colors, pattern, fabric, fit, occasions, seasons, description, times_worn, last_worn_at',
    )
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) notFound()
  const item = data as ItemDetail

  // Pairings + "in N looks" — both from the user's real data.
  const [{ data: others }, looksRes] = await Promise.all([
    supabase
      .from('items')
      .select('id, cleaned_image_key, category, subcategory, colors')
      .eq('is_active', true)
      .neq('id', id)
      .order('times_worn', { ascending: false })
      .limit(24)
      .returns<PairRow[]>(),
    supabase.from('outfits').select('id', { count: 'exact', head: true }).contains('item_ids', [id]),
  ])

  const wantBuckets = PAIR_MAP[bucketFor(item.category, item.subcategory)] ?? []
  const pairs = (others ?? [])
    .map((p) => ({ ...p, bucket: bucketFor(p.category, p.subcategory) }))
    .sort((a, b) => {
      const ai = wantBuckets.indexOf(a.bucket)
      const bi = wantBuckets.indexOf(b.bucket)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    .slice(0, 6)

  const allKeys = [item.cleaned_image_key, ...pairs.map((p) => p.cleaned_image_key)].filter(
    (k): k is string => Boolean(k),
  )
  const urlMap = await getSignedUrls(allKeys)
  const heroUrl = item.cleaned_image_key ? urlMap[item.cleaned_image_key] ?? null : null

  const title = item.subcategory || item.category || 'Item'
  const eyebrow = [item.category, item.subcategory].filter(Boolean).join(' · ') || 'Wardrobe'
  const heroColor = colorHex(item.colors)

  const lastWorn = (() => {
    if (!item.last_worn_at) return '—'
    const days = Math.floor((Date.now() - new Date(item.last_worn_at).getTime()) / 86400000)
    if (days <= 0) return 'today'
    return `${days}d`
  })()

  const attrs: { label: string; dot?: string }[] = []
  if (item.colors?.[0]) attrs.push({ label: item.colors[0], dot: heroColor })
  if (item.fabric) attrs.push({ label: item.fabric })
  if (item.fit) attrs.push({ label: `${item.fit} fit` })
  for (const s of item.seasons ?? []) attrs.push({ label: s })
  if (item.occasions?.length) attrs.push({ label: item.occasions.join(' · ') })

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
          <span>
            Background removed · tagged by AI — tweak anything that&apos;s off below.
          </span>
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
            <b>{looksRes.count ?? 0}</b>
            <small>in looks</small>
          </div>
        </div>

        {pairs.length > 0 && (
          <>
            <div className="sec-t">Styles beautifully with</div>
            <div className="pairs">
              {pairs.map((p) => {
                const url = p.cleaned_image_key ? urlMap[p.cleaned_image_key] ?? null : null
                return (
                  <Link key={p.id} href={`/closet/${p.id}`} className="pair">
                    <div className="ph" style={{ background: url ? undefined : `${colorHex(p.colors)}44` }}>
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={p.subcategory || p.category || 'item'} />
                      ) : (
                        <Glyph category={p.category} subcategory={p.subcategory} color={colorHex(p.colors)} />
                      )}
                    </div>
                    <div className="nm">{p.subcategory || p.category || 'Item'}</div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>

      <ItemActions itemId={item.id} />
    </>
  )
}
