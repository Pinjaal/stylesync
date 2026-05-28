import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/storage'
import AddItemButton from './_components/AddItemButton'

export default async function ClosetPage() {
  const supabase = await createClient()

  const { data: items, error } = await supabase
    .from('items')
    .select('id, category, subcategory, colors, cleaned_image_key, description')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Generate signed URLs in parallel (fast for ~20 items, fine for v1)
  const itemsWithUrls = await Promise.all(
    (items ?? []).map(async (item) => {
      let imageUrl: string | null = null
      if (item.cleaned_image_key) {
        try {
          imageUrl = await getSignedUrl(item.cleaned_image_key)
        } catch {
          imageUrl = null // bad key, show placeholder
        }
      }
      return { ...item, imageUrl }
    }),
  )

  return (
    <main className="px-4 py-6 relative">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Your closet</h1>
        <AddItemButton />
      </header>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
          Couldn't load items: {error.message}
        </div>
      )}

      {itemsWithUrls.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl py-16 text-center">
          <p className="text-gray-500 text-sm mb-1">No items yet</p>
          <p className="text-gray-400 text-xs">Add your first piece to get started</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-3">
            {itemsWithUrls.length} {itemsWithUrls.length === 1 ? 'item' : 'items'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {itemsWithUrls.map((item) => (
              <div
                key={item.id}
                className="aspect-square bg-gray-50 rounded-xl overflow-hidden relative group"
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.description || 'Wardrobe item'}
                    className="w-full h-full object-contain p-3"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                    No image
                  </div>
                )}

                {item.category && (
                  <span className="absolute bottom-1.5 left-1.5 text-[10px] font-medium bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-gray-700 capitalize">
                    {item.category}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  )
}