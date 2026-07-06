'use client'

import { useState, useTransition } from 'react'
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react'
import { Spark } from '@/components/Spark'
import { Glyph } from '@/components/Glyph'
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

export function SparkOutfit({
  outfit,
  isTopPick,
}: {
  outfit: Outfit
  isTopPick: boolean
}) {
  const [rating, setRating] = useState<-1 | 1 | null>(null)
  const [worn, setWorn] = useState(false)
  const [pending, startTransition] = useTransition()
  const canAct = Boolean(outfit.id)

  function handleRate(value: -1 | 1) {
    if (!outfit.id) return
    const prev = rating
    setRating(value === rating ? null : value)
    startTransition(async () => {
      try {
        await rateOutfit(outfit.id!, value)
      } catch {
        setRating(prev)
      }
    })
  }

  function handleWorn() {
    if (!outfit.id || worn) return
    setWorn(true)
    startTransition(async () => {
      try {
        await markOutfitWorn(outfit.id!)
      } catch {
        setWorn(false)
      }
    })
  }

  return (
    <article className={`ocard${isTopPick ? ' top' : ''}`}>
      {isTopPick && (
        <div className="otop-tag">
          <Spark /> SPARK&apos;S TOP PICK
        </div>
      )}

      <div className="flat">
        {outfit.items.map((item) => (
          <div className="fc" key={item.id}>
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt={item.subcategory || item.category || 'item'} />
            ) : (
              <Glyph
                category={item.category}
                subcategory={item.subcategory}
                className="cut"
              />
            )}
          </div>
        ))}
      </div>

      <div className="sparkbubble">
        <div className="av">
          <Spark />
        </div>
        <p>{outfit.reasoning}</p>
      </div>

      {outfit.style_tips.length > 0 && (
        <div className="otips">
          {outfit.style_tips.map((t, i) => (
            <span className="t" key={i}>
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="ofeet">
        <button
          className={`tbtn up${rating === 1 ? ' on' : ''}`}
          onClick={() => handleRate(1)}
          disabled={!canAct || pending}
          aria-label="Like this look"
        >
          <ThumbsUp />
        </button>
        <button
          className={`tbtn down${rating === -1 ? ' on' : ''}`}
          onClick={() => handleRate(-1)}
          disabled={!canAct || pending}
          aria-label="Dislike this look"
        >
          <ThumbsDown />
        </button>
        <button
          className={`worebtn${worn ? ' done' : ''}`}
          onClick={handleWorn}
          disabled={!canAct || worn}
        >
          <Check strokeWidth={2.4} />
          {worn ? 'Logged!' : 'I wore this'}
        </button>
      </div>
    </article>
  )
}
