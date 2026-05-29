'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

const OCCASIONS = ['casual', 'work', 'party', 'formal', 'gym', 'travel', 'ethnic', 'date']
const SEASONS = ['summer', 'winter', 'monsoon']

interface OutfitItem {
  id: string
  category: string | null
  subcategory: string | null
  colors: string[] | null
  imageUrl: string | null
}
interface Outfit {
  reasoning: string
  style_tips: string[]
  confidence: number | null
  items: OutfitItem[]
}

export default function OutfitPage() {
  const [occasion, setOccasion] = useState('casual')
  const [season, setSeason] = useState('summer')
  const [styleQuery, setStyleQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outfits, setOutfits] = useState<Outfit[] | null>(null)

  async function getOutfits() {
    setLoading(true)
    setError(null)
    setOutfits(null)
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasion,
          season,
          styleQuery: styleQuery.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      setOutfits(data.outfits ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6">Get an outfit</h1>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Occasion</label>
          <select
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md capitalize bg-white"
          >
            {OCCASIONS.map((o) => (
              <option key={o} value={o} className="capitalize">{o}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Season</label>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md capitalize bg-white"
          >
            {SEASONS.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Style note <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            value={styleQuery}
            onChange={(e) => setStyleQuery(e.target.value)}
            placeholder="e.g. minimalist neutral, something bold"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <button
          onClick={getOutfits}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-md hover:bg-gray-800 transition disabled:opacity-60"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {loading ? 'Styling…' : 'Get outfit'}
        </button>

        {loading && (
          <p className="text-xs text-gray-400 text-center">
            First request can take up to a minute if the AI is waking up.
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {outfits && outfits.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">
          No outfits came back. Try a different occasion or add more items.
        </p>
      )}

      <div className="space-y-5">
        {outfits?.map((outfit, idx) => (
          <article key={idx} className="rounded-2xl border border-gray-200 bg-white p-4">
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

            {idx === 0 && (
              <span className="inline-block text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 mb-2">
                Top pick
              </span>
            )}

            <p className="text-sm text-gray-700 mb-2">{outfit.reasoning}</p>

            {outfit.style_tips.length > 0 && (
              <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                {outfit.style_tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </main>
  )
}