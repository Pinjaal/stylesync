import { createClient } from '@/lib/supabase/server'
import { getSignedUrls } from '@/lib/storage'
import { bucketFor } from '@/components/Glyph'
import { colorHex } from '@/lib/colors'
import { loadSegments } from './segments-actions'
import { ClosetView, type ClosetItem } from './_components/ClosetView'

// Always render fresh so newly uploaded items show up after router.refresh()
export const dynamic = 'force-dynamic'

interface Row {
  id: string
  cleaned_image_key: string | null
  category: string | null
  subcategory: string | null
  colors: string[] | null
  times_worn: number | null
  last_worn_at: string | null
}

export default async function ClosetPage() {
  const supabase = await createClient()

  const [itemsRes, outfitsRes, segments] = await Promise.all([
    supabase
      .from('items')
      .select('id, cleaned_image_key, category, subcategory, colors, times_worn, last_worn_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .returns<Row[]>(),
    supabase.from('outfits').select('id', { count: 'exact', head: true }),
    loadSegments(),
  ])

  const rows = itemsRes.data ?? []
  const keys = rows
    .map((i) => i.cleaned_image_key)
    .filter((k): k is string => Boolean(k))
  const urlMap = await getSignedUrls(keys)

  const items: ClosetItem[] = rows.map((r) => ({
    id: r.id,
    label: r.subcategory || r.category || 'Item',
    category: r.category,
    subcategory: r.subcategory,
    bucket: bucketFor(r.category, r.subcategory),
    color: colorHex(r.colors),
    timesWorn: r.times_worn ?? 0,
    imageUrl: r.cleaned_image_key ? urlMap[r.cleaned_image_key] ?? null : null,
  }))

  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const wornThisMonth = rows.filter(
    (r) => r.last_worn_at && new Date(r.last_worn_at).getTime() >= monthAgo,
  ).length
  const wornPct = rows.length ? Math.round((wornThisMonth / rows.length) * 100) : 0

  return (
    <ClosetView
      items={items}
      segments={segments}
      stats={{ pieces: rows.length, looks: outfitsRes.count ?? 0, wornPct }}
      error={itemsRes.error?.message ?? null}
    />
  )
}
