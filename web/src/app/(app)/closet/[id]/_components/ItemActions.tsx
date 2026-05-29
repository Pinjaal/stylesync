'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Trash2, Loader2 } from 'lucide-react'
import { markWorn, deleteItem } from '../actions'

export function ItemActions({ itemId }: { itemId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [wornJustNow, setWornJustNow] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleWorn() {
    setError(null)
    startTransition(async () => {
      try {
        await markWorn(itemId)
        setWornJustNow(true)
        setTimeout(() => setWornJustNow(false), 2000)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed')
      }
    })
  }

  function handleDelete() {
    if (!window.confirm('Delete this item? This cannot be undone.')) return
    setError(null)
    startTransition(async () => {
      try {
        await deleteItem(itemId)
        router.push('/closet')
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleWorn}
          disabled={pending}
          className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-md hover:bg-gray-800 transition disabled:opacity-60"
        >
          {pending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
          {wornJustNow ? 'Logged!' : 'I wore this'}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="flex items-center justify-center gap-2 border border-red-200 text-red-600 px-4 py-2.5 rounded-md hover:bg-red-50 transition disabled:opacity-60"
        >
          <Trash2 size={18} />
          Delete
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </div>
  )
}