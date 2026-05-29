import { createClient } from '@/lib/supabase/server'
import { getSignedUrls } from '@/lib/storage'
import AddItemButton from './_components/AddItemButton'
import { ItemCard, type ClosetItem } from './_components/ItemCard'

// Always render fresh so newly uploaded items show up after router.refresh()
export const dynamic = 'force-dynamic'

export default async function ClosetPage() {
  const supabase = await createClient()

  // RLS already scopes rows to the logged-in user, so no user_id filter needed.
  const { data: items, error } = await supabase
    .from('items')
    .select('id, cleaned_image_key, category, subcategory, colors, description')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .returns<ClosetItem[]>()

  const keys = (items ?? [])
    .map((i) => i.cleaned_image_key)
    .filter((k): k is string => Boolean(k))

  const urlMap = await getSignedUrls(keys)

  return (
    <main className="px-4 py-6 relative">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Your closet</h1>
        <AddItemButton />
      </header>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
          Couldn&apos;t load your closet: {error.message}
        </p>
      )}

      {!items || items.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl py-16 text-center">
          <p className="text-gray-500 text-sm mb-1">No items yet</p>
          <p className="text-gray-400 text-xs">Add your first piece to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              imageUrl={
                item.cleaned_image_key ? urlMap[item.cleaned_image_key] ?? null : null
              }
            />
          ))}
        </div>
      )}
    </main>
  )
}