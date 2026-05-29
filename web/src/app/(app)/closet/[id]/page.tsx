import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/storage'
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

export default async function ItemDetailPage(
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params
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

  const imageUrl = item.cleaned_image_key
    ? await getSignedUrl(item.cleaned_image_key)
    : null

  const title = item.subcategory || item.category || 'Item'

  return (
    <main className="px-4 py-6">
      <Link
        href="/closet"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
      >
        <ChevronLeft size={18} /> Closet
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 aspect-square flex items-center justify-center p-6 mb-5">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={item.description || title}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-sm text-gray-400">No image</span>
        )}
      </div>

      <h1 className="text-2xl font-semibold capitalize mb-1">{title}</h1>
      {item.description && <p className="text-gray-600 mb-4">{item.description}</p>}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-6">
        <Detail label="Category" value={item.category} />
        <Detail label="Colors" value={item.colors?.join(', ')} />
        <Detail label="Pattern" value={item.pattern} />
        <Detail label="Fabric" value={item.fabric} />
        <Detail label="Fit" value={item.fit} />
        <Detail label="Occasions" value={item.occasions?.join(', ')} />
        <Detail label="Seasons" value={item.seasons?.join(', ')} />
        <Detail label="Times worn" value={String(item.times_worn ?? 0)} />
      </dl>

      <ItemActions itemId={item.id} />
    </main>
  )
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="capitalize">{value}</dd>
    </div>
  )
}