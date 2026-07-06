'use client'

import { useEffect, useRef, useState } from 'react'
import { Shuffle } from 'lucide-react'
import { Spark } from '@/components/Spark'
import { SparkOutfit, type Outfit } from './_components/OutfitCard'

const OCCASIONS = ['Casual', 'Work', 'Party', 'Date', 'Festive', 'Travel']
const WEATHER = ['Summer', 'Monsoon', 'Winter']
const MOODS = ['Minimal', 'Bold', 'Comfy', 'Polished', 'Something new']
const STAGES = [
  'Reading your closet',
  'Matching to your vibe',
  'Coordinating colours',
  'Composing your looks',
]

export function StyleClient({
  name,
  dnaTitle,
}: {
  name: string
  dnaTitle: string | null
}) {
  const [occasion, setOccasion] = useState('Casual')
  const [weather, setWeather] = useState('Summer')
  const [moods, setMoods] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState(0)
  const [outfits, setOutfits] = useState<Outfit[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (stageTimer.current) clearInterval(stageTimer.current)
  }, [])

  function toggleMood(m: string) {
    setMoods((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]))
  }

  async function styleMe() {
    setLoading(true)
    setError(null)
    setOutfits(null)
    setStage(0)
    if (stageTimer.current) clearInterval(stageTimer.current)
    stageTimer.current = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      620,
    )
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasion: occasion.toLowerCase(),
          season: weather.toLowerCase(),
          styleQuery: moods.join(', ').toLowerCase() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      setOutfits(data.outfits ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      if (stageTimer.current) clearInterval(stageTimer.current)
      setLoading(false)
    }
  }

  const showForm = !loading && !outfits

  return (
    <>
      <div className="appbar">
        <div>
          <div className="title">Get Styled</div>
          <div className="sub">Spark builds looks from your closet</div>
        </div>
        <div className="avatar">{name.charAt(0).toUpperCase()}</div>
      </div>

      <div className="spark-hero">
        <div className="sp">
          <Spark />
        </div>
        <div className="k">✨ Spark · your stylist</div>
        <h3>
          Hey {name} — where are we headed{dnaTitle ? ' today' : ''}?
        </h3>
      </div>

      {showForm && (
        <div className="pad">
          <div className="qlabel">The occasion</div>
          <div className="pillwrap">
            {OCCASIONS.map((o) => (
              <button
                key={o}
                className={`pill${occasion === o ? ' on' : ''}`}
                onClick={() => setOccasion(o)}
              >
                {o}
              </button>
            ))}
          </div>

          <div className="qlabel">The weather</div>
          <div className="pillwrap">
            {WEATHER.map((w) => (
              <button
                key={w}
                className={`pill${weather === w ? ' on' : ''}`}
                onClick={() => setWeather(w)}
              >
                {w}
              </button>
            ))}
          </div>

          <div className="qlabel">
            Any mood?{' '}
            <span
              style={{
                textTransform: 'none',
                letterSpacing: 0,
                color: 'var(--muted)',
                fontWeight: 600,
              }}
            >
              (optional)
            </span>
          </div>
          <div className="pillwrap">
            {MOODS.map((m) => (
              <button
                key={m}
                className={`pill${moods.includes(m) ? ' on' : ''}`}
                onClick={() => toggleMood(m)}
              >
                {m}
              </button>
            ))}
          </div>

          <button className="btn style-cta" onClick={styleMe}>
            <Spark /> Style me
          </button>
          <p className="tiny dim" style={{ textAlign: 'center', marginTop: 10 }}>
            First request can take up to a minute if Spark is waking up.
          </p>
        </div>
      )}

      {loading && (
        <div className="thinking">
          <Spark className="think-spark" />
          <div className="think-t">Spark is styling…</div>
          <div className="think-d">{STAGES[stage]}</div>
        </div>
      )}

      {!loading && outfits && (
        <div className="pad">
          <div className="reshead">
            <div className="h2">
              {outfits.length} {outfits.length === 1 ? 'look' : 'looks'}, ready
            </div>
            <button className="shuffle" onClick={styleMe}>
              <Shuffle strokeWidth={2.2} /> Shuffle
            </button>
          </div>

          {outfits.length === 0 ? (
            <div className="empty">
              <p>No looks came back. Try a different occasion, or add more pieces.</p>
            </div>
          ) : (
            outfits.map((o, i) => (
              <SparkOutfit key={o.id ?? i} outfit={o} isTopPick={i === 0} />
            ))
          )}

          <button
            className="btn btn--ghost"
            onClick={() => {
              setOutfits(null)
              setError(null)
            }}
          >
            Start over
          </button>
          <div style={{ height: 8 }} />
        </div>
      )}

      {error && (
        <div className="pad">
          <p className="alert">{error}</p>
          {!loading && (
            <button className="btn btn--ghost" onClick={() => setError(null)}>
              Try again
            </button>
          )}
        </div>
      )}
    </>
  )
}
