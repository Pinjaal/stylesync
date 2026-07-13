'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Flame, Shuffle, Heart, Check, ArrowRight, Loader2 } from 'lucide-react'
import { Spark } from '@/components/Spark'
import { LookCollage } from './_components/LookCollage'
import { SwipeDeck } from './_components/SwipeDeck'
import { LookDetail } from './_components/LookDetail'
import type { Look } from './_components/types'
import type { StreakInfo } from '@/lib/streak'
import { rateOutfit, markOutfitWorn } from './actions'

const QUICK: { label: string; occasion: string }[] = [
  { label: 'Brunch', occasion: 'casual' },
  { label: 'First date', occasion: 'date' },
  { label: 'Rainy Monday', occasion: 'casual' },
  { label: 'Airport fit', occasion: 'travel' },
  { label: 'Gym → drinks', occasion: 'gym' },
  { label: 'Interview', occasion: 'formal' },
]

function seasonNow(): string {
  const m = new Date().getMonth() // 0-11
  if (m >= 5 && m <= 8) return 'monsoon'
  if (m === 11 || m <= 1) return 'winter'
  return 'summer'
}

type View = 'home' | 'deck' | 'look'

export function StyleClient({
  name,
  streak,
}: {
  name: string
  streak: StreakInfo
}) {
  const [view, setView] = useState<View>('home')
  const [today, setToday] = useState<Look | null>(null)
  const [todayLoading, setTodayLoading] = useState(true)
  const [todayError, setTodayError] = useState<string | null>(null)
  const [todayWorn, setTodayWorn] = useState(false)
  const [todaySaved, setTodaySaved] = useState(false)

  const [looks, setLooks] = useState<Look[]>([])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [activeLook, setActiveLook] = useState<Look | null>(null)
  const backTo = useRef<View>('home')

  const [prompt, setPrompt] = useState('')
  const [quick, setQuick] = useState<string | null>(null)

  const [greet, setGreet] = useState('Hello')
  const [dateStr, setDateStr] = useState('')
  const [todayOccasion, setTodayOccasion] = useState('everyday')

  const fetchLooks = useCallback(
    async (occasion: string, styleQuery?: string): Promise<Look[]> => {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occasion, season: seasonNow(), styleQuery }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      return (data.outfits ?? []) as Look[]
    },
    [],
  )

  // greeting + today's pick — one generation on mount
  useEffect(() => {
    let cancelled = false
    const d = new Date()
    const h = d.getHours()
    setGreet(h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening')
    setDateStr(
      d
        .toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })
        .toUpperCase(),
    )
    const occ = d.getDay() >= 1 && d.getDay() <= 5 ? 'work' : 'casual'
    setTodayOccasion(occ)
    ;(async () => {
      try {
        const got = await fetchLooks(occ)
        if (cancelled) return
        setToday(got[0] ?? null)
        setLooks(got)
        if (!got.length) setTodayError('empty')
      } catch (e) {
        if (!cancelled) setTodayError(e instanceof Error ? e.message : 'Could not style today')
      } finally {
        if (!cancelled) setTodayLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lastReq = useRef<{ occasion: string; styleQuery?: string }>({ occasion: 'casual' })

  async function styleMe() {
    const q = QUICK.find((x) => x.label === quick)
    const occasion = q?.occasion ?? 'casual'
    const styleQuery = [quick, prompt.trim()].filter(Boolean).join(', ') || undefined
    lastReq.current = { occasion, styleQuery }
    setGenerating(true)
    setGenError(null)
    try {
      const got = await fetchLooks(occasion, styleQuery)
      setLooks(got)
      setView('deck')
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Could not style right now. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function needMore() {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      const got = await fetchLooks(lastReq.current.occasion, lastReq.current.styleQuery)
      setLooks((cur) => [...cur, ...got])
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false)
    }
  }

  async function reshuffle() {
    setLoadingMore(true)
    try {
      const got = await fetchLooks(lastReq.current.occasion, lastReq.current.styleQuery)
      setLooks(got)
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false)
    }
  }

  function saveLook(look: Look) {
    if (look.id) rateOutfit(look.id, 1).catch(() => {})
  }

  function openDeckFromToday() {
    lastReq.current = { occasion: todayOccasion }
    setView('deck')
  }

  // ---- deck view ----
  if (view === 'deck') {
    return (
      <SwipeDeck
        looks={looks}
        loadingMore={loadingMore}
        onNeedMore={needMore}
        onReshuffle={reshuffle}
        onSave={saveLook}
        onOpen={(l) => {
          setActiveLook(l)
          backTo.current = 'deck'
          setView('look')
        }}
        onExit={() => setView('home')}
      />
    )
  }

  // ---- look detail view ----
  if (view === 'look' && activeLook) {
    return (
      <LookDetail
        look={activeLook}
        occasion={lastReq.current.occasion}
        onBack={() => setView(backTo.current)}
      />
    )
  }

  // ---- home view ----
  function wearToday() {
    if (!today?.id || todayWorn) return
    setTodayWorn(true)
    markOutfitWorn(today.id).catch(() => setTodayWorn(false))
  }
  function saveToday() {
    if (!today?.id || todaySaved) return
    setTodaySaved(true)
    rateOutfit(today.id, 1).catch(() => setTodaySaved(false))
  }

  return (
    <>
      <div className="stylist-head">
        <div>
          <div className="date">{dateStr || 'Today'}</div>
          <div className="hi">
            {greet}, {name}
          </div>
        </div>
      </div>

      <div className="streak">
        <span className="flame">
          <Flame fill="currentColor" strokeWidth={0} />
        </span>
        <div className="grow">
          <div className="t">
            {streak.streak > 0
              ? `${streak.streak}-day styling streak`
              : 'Start a styling streak'}
          </div>
          <div className="s">
            {streak.alive ? "You've styled today — nice." : 'Style a look today to keep it alive'}
          </div>
        </div>
        <div className="lvl">
          <b>Lvl {streak.level}</b>
          <small>{streak.title}</small>
        </div>
      </div>

      <div className="today-label">Today&apos;s look · for {todayOccasion}</div>

      {todayLoading ? (
        <div className="lookcard">
          <div className="collage">
            <div className="big">
              <div className="cell shimmer" />
            </div>
            <div className="col">
              <div className="cell shimmer" />
              <div className="cell shimmer" />
            </div>
          </div>
          <div className="look-why">
            <Spark />
            <p>Spark is styling today&apos;s look…</p>
          </div>
        </div>
      ) : today ? (
        <>
          <div className="lookcard">
            <button
              onClick={() => {
                setActiveLook(today)
                backTo.current = 'home'
                setView('look')
              }}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none' }}
            >
              <LookCollage items={today.items} />
            </button>
            <div className="look-why">
              <Spark />
              <p>
                {today.title ? <b>{today.title}. </b> : null}
                {today.reasoning}
              </p>
            </div>
          </div>
          <div className="look-actions">
            <button className="btn" onClick={wearToday} disabled={!today.id || todayWorn}>
              {todayWorn ? (
                <>
                  <Check size={18} strokeWidth={2.4} /> Logged today
                </>
              ) : (
                'Wear today'
              )}
            </button>
            <button className="square" onClick={openDeckFromToday} aria-label="Shuffle looks">
              <Shuffle size={20} strokeWidth={1.9} />
            </button>
            <button
              className={`square heart${todaySaved ? ' on' : ''}`}
              onClick={saveToday}
              disabled={!today.id || todaySaved}
              aria-label="Save look"
            >
              <Heart size={20} fill={todaySaved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </>
      ) : (
        <div className="lookcard">
          <div className="look-why">
            <Spark />
            <p>
              {todayError === 'empty'
                ? 'Add a few pieces to your closet and Spark will style your first look.'
                : "Couldn't style a look right now — try the prompt below."}
            </p>
          </div>
        </div>
      )}

      <h2 className="ask-title">
        What&apos;s the <em>occasion?</em>
      </h2>
      <div className="ask-input">
        <input
          placeholder="Rooftop dinner, 8pm — a little dressy"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') styleMe()
          }}
        />
      </div>
      <div className="today-label">Or tap a quick one</div>
      <div className="quickchips">
        {QUICK.map((q) => (
          <button
            key={q.label}
            className={`qchip${quick === q.label ? ' on' : ''}`}
            onClick={() => setQuick((c) => (c === q.label ? null : q.label))}
          >
            {q.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '22px 22px 0' }}>
        <button className="btn" onClick={styleMe} disabled={generating}>
          {generating ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Styling looks…
            </>
          ) : (
            <>
              Style me <ArrowRight size={18} strokeWidth={2.2} />
            </>
          )}
        </button>
        {genError && (
          <p className="alert" style={{ marginTop: 12 }}>
            {genError}
          </p>
        )}
      </div>
    </>
  )
}
