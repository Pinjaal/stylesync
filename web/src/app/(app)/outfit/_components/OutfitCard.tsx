'use client'

import { useState, useTransition } from 'react'
import { ThumbsUp, ThumbsDown, Check, Loader2 } from 'lucide-react'
import { rateOutfit, markOutfitWorn } from '../actions'

interface OutfitItem {
  id: string
  category: string | null
  subcategory: string | null
  colors: string[] | null
  imageUrl: string | null
}

export interface Outfit {
  id: string | null
  reasoning: string
  style_tips: string[]
  confidence: number | null
  items: OutfitItem[]
}

export function OutfitCard({ outfit, isTopPick }: { outfit: Outfit; isTopPick: boolean }) {
  const [rating, setRating] = useState<-1 | 1 | null>(null)
  const [worn, setWorn] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const canAct = Boolean(outfit.id)

  function handleRate(value: -1 | 1) {
    if (!outfit.id) return
    const prev = rating
    setRating(value) // optimistic
    setError(null)
    startTransition(async () => {
      try {
        await rateOutfit(outfit.id!, value)
      } catch (e) {
        setRating(prev)
        setError(e instanceof Error ? e.message : 'Failed to save rating')
      }
    })
  }

  function handleWorn() {
    if (!outfit.id || worn) return
    setWorn(true) // optimistic
    setError(null)
    startTransition(async () => {
      try {
        await markOutfitWorn(outfit.id!)
      } catch (e) {
        setWorn(false)
        setError(e instanceof Error ? e.message : 'Failed to log')
      }
    })
  }

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-2 mb-3">
        {outfit.items.map((item) => (
          <div
            key={item.id}
            className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center p-2"
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.subcategory || item.category || 'item'}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-[10px] text-gray-400">no image</span>
            )}
          </div>
        ))}
      </div>

      {isTopPick && (
        <span className="inline-block text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 mb-2">
          Top pick
        </span>
      )}

      <p className="text-sm text-gray-700 mb-2">{outfit.reasoning}</p>

      {outfit.style_tips.length > 0 && (
        <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside mb-3">
          {outfit.style_tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => handleRate(1)}
          disabled={!canAct || pending}
          aria-label="Like this outfit"
          className={`p-2 rounded-md border transition disabled:opacity-50 ${
            rating === 1
              ? 'border-green-300 bg-green-50 text-green-700'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <ThumbsUp size={16} />
        </button>
        <button
          type="button"
          onClick={() => handleRate(-1)}
          disabled={!canAct || pending}
          aria-label="Dislike this outfit"
          className={`p-2 rounded-md border transition disabled:opacity-50 ${
            rating === -1
              ? 'border-red-300 bg-red-50 text-red-700'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <ThumbsDown size={16} />
        </button>

        <button
          type="button"
          onClick={handleWorn}
          disabled={!canAct || pending || worn}
          className="ml-auto flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-black text-white hover:bg-gray-800 transition disabled:opacity-50"
        >
          {pending && !worn ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {worn ? 'Worn ✓' : 'I wore this'}
        </button>
      </div>

      {!canAct && (
        <p className="text-[11px] text-gray-400 mt-2">
          Couldn&apos;t save this outfit, so feedback is disabled.
        </p>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </article>
  )
}