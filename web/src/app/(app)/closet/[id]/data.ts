import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrls } from '@/lib/storage'
import { bucketFor } from '@/components/Glyph'
import { colorHex } from '@/lib/colors'

// Shared by the full page (/closet/[id]) and the desktop detail rail
// (/api/item/[id]) so both render identical data from one query path.

export interface ItemDetail {
  id: string
  name: string | null
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

export interface PairView {
  id: string
  label: string
  imageUrl: string | null
  color: string
}

export interface ItemDetailView {
  item: ItemDetail
  title: string
  /** true when the title came from a user-typed name — callers must not capitalise it. */
  isNamed: boolean
  eyebrow: string
  heroUrl: string | null
  heroColor: string
  lastWorn: string
  inLooks: number
  attrs: { label: string; dot?: string }[]
  pairs: PairView[]
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

export const ITEM_COLS =
  'id, name, cleaned_image_key, category, subcategory, colors, pattern, fabric, fit, occasions, seasons, description, times_worn, last_worn_at'

/** Same list minus `name`, for when 0005_item_name hasn't been applied yet. */
export const ITEM_COLS_NO_NAME = ITEM_COLS.replace('id, name,', 'id,')

/** Postgres 42703 for the not-yet-added `name` column. */
export function isMissingNameColumn(err: { message?: string } | null): boolean {
  return Boolean(err?.message && /column\s+\S*\bname\b.*does not exist/i.test(err.message))
}

/** Returns null when the item doesn't exist or isn't the caller's (RLS). */
export async function getItemDetail(id: string): Promise<ItemDetailView | null> {
  const supabase = await createClient()

  let res = await supabase.from('items').select(ITEM_COLS).eq('id', id).eq('is_active', true).maybeSingle()
  if (isMissingNameColumn(res.error)) {
    // 0005_item_name not applied — degrade to the AI tags rather than break.
    res = await supabase
      .from('items')
      .select(ITEM_COLS_NO_NAME)
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle()
  }
  if (res.error) throw new Error(res.error.message)
  if (!res.data) return null
  const item = { name: null, ...(res.data as object) } as ItemDetail

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
  const pairRows = (others ?? [])
    .map((p) => ({ ...p, bucket: bucketFor(p.category, p.subcategory) }))
    .sort((a, b) => {
      const ai = wantBuckets.indexOf(a.bucket)
      const bi = wantBuckets.indexOf(b.bucket)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    .slice(0, 6)

  const urlMap = await getSignedUrls(
    [item.cleaned_image_key, ...pairRows.map((p) => p.cleaned_image_key)].filter(
      (k): k is string => Boolean(k),
    ),
  )

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

  return {
    item,
    // name is user-typed and wins; the AI tags remain the fallback.
    title: item.name || item.subcategory || item.category || 'Item',
    isNamed: Boolean(item.name),
    eyebrow: [item.category, item.subcategory].filter(Boolean).join(' · ') || 'Wardrobe',
    heroUrl: item.cleaned_image_key ? urlMap[item.cleaned_image_key] ?? null : null,
    heroColor,
    lastWorn,
    inLooks: looksRes.count ?? 0,
    attrs,
    pairs: pairRows.map((p) => ({
      id: p.id,
      label: p.subcategory || p.category || 'Item',
      imageUrl: p.cleaned_image_key ? urlMap[p.cleaned_image_key] ?? null : null,
      color: colorHex(p.colors),
    })),
  }
}
