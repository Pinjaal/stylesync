import Link from 'next/link'

export interface ClosetItem {
  id: string
  cleaned_image_key: string | null
  category: string | null
  subcategory: string | null
  colors: string[] | null
  description: string | null
}

export function ItemCard({
  item,
  imageUrl,
}: {
  item: ClosetItem
  imageUrl: string | null
}) {
  const label = item.subcategory || item.category || 'Item'

  return (
    <Link
      href={`/closet/${item.id}`}
      className="block rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-gray-300 transition"
    >
      <div className="aspect-square bg-gray-50 flex items-center justify-center p-3">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={item.description || label}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-xs text-gray-400">No image</span>
        )}
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-medium capitalize truncate">{label}</p>
        {item.colors?.length ? (
          <p className="text-xs text-gray-500 capitalize truncate">
            {item.colors.join(', ')}
          </p>
        ) : null}
      </div>
    </Link>
  )
}