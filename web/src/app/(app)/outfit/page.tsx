'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { OutfitCard, type Outfit } from './_components/OutfitCard'

const OCCASIONS = ['casual', 'work', 'party', 'formal', 'gym', 'travel', 'ethnic', 'date']
const SEASONS = ['summer', 'winter', 'monsoon']

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
          <OutfitCard key={outfit.id ?? idx} outfit={outfit} isTopPick={idx === 0} />
        ))}
      </div>
    </main>
  )
}