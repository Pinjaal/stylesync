'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Heart, Shuffle, X, Check } from 'lucide-react'
import { HangerLogo } from '@/components/HangerLogo'
import { Spark } from '@/components/Spark'
import { Glyph } from '@/components/Glyph'
import { LookCollage } from '@/app/(app)/outfit/_components/LookCollage'
import { colorHex } from '@/lib/colors'
import { DEMO_ITEMS, DEMO_LOOKS, OCCASIONS, demoItems, type DemoLook } from './demoData'

export function TryDemo() {
  const [occasion, setOccasion] = useState<string>('Casual')
  const [looks, setLooks] = useState<DemoLook[] | null>(null)
  const [thinking, setThinking] = useState(false)
  const [count, setCount] = useState(0)
  const [showSignup, setShowSignup] = useState(false)
  const [bannerOpen, setBannerOpen] = useState(true)

  function styleMe() {
    setThinking(true)
    setLooks(null)
    setTimeout(() => {
      setThinking(false)
      setLooks(DEMO_LOOKS[occasion] ?? [])
      const next = count + 1
      setCount(next)
      if (next === 2) setShowSignup(true) // nudge after a couple of tries
    }, 900)
  }

  return (
    <main className="shell app-scroll">
      {/* top bar */}
      <div className="try-topbar">
        <div className="brand">
          <HangerLogo />
          <span className="wm">
            Style<em>Sync</em>
          </span>
          <span className="demo-chip">DEMO</span>
        </div>
        <Link href="/login" className="try-login">
          Log in
        </Link>
      </div>

      {/* persistent signup banner */}
      {bannerOpen && (
        <div className="demo-banner">
          <span>
            You&apos;re trying a <b>sample closet</b> — sign up to style your own clothes.
          </span>
          <Link href="/signup" className="db-cta">
            Sign up
          </Link>
          <button className="db-x" onClick={() => setBannerOpen(false)} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="pad" style={{ paddingTop: 6 }}>
        <div className="eyebrow" style={{ marginBottom: 4 }}>
          Try it — no signup
        </div>
        <h1 className="h1">Get styled in seconds</h1>
        <p className="dim" style={{ fontSize: 14.5, marginTop: 4 }}>
          Pick an occasion and let Spark style this sample closet.
        </p>

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

        <button className="btn style-cta" onClick={styleMe} disabled={thinking}>
          <Spark /> {looks ? 'Restyle' : 'Style me'}
        </button>
      </div>

      {thinking && (
        <div className="thinking">
          <Spark className="think-spark" />
          <div className="think-t">Spark is styling…</div>
          <div className="think-d">Coordinating colours</div>
        </div>
      )}

      {looks && !thinking && (
        <div className="pad">
          <div className="reshead">
            <div className="h2">{looks.length} looks, ready</div>
            <button className="shuffle" onClick={styleMe}>
              <Shuffle strokeWidth={2.2} /> Shuffle
            </button>
          </div>

          {looks.map((look, i) => (
            <article className={`ocard${i === 0 ? ' top' : ''}`} key={look.title}>
              {i === 0 && (
                <div className="otop-tag">
                  <Spark /> SPARK&apos;S TOP PICK
                </div>
              )}
              <div style={{ padding: 14 }}>
                <LookCollage items={demoItems(look.itemIds)} showLabels />
              </div>
              <div className="sparkbubble">
                <div className="av">
                  <Spark />
                </div>
                <p>
                  <b>{look.title}.</b> {look.reasoning}
                </p>
              </div>
              {look.tips.length > 0 && (
                <div className="otips">
                  {look.tips.map((t) => (
                    <span className="t" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="ofeet">
                <span
                  className="tiny"
                  style={{ color: 'var(--accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <span style={{ width: 13, height: 13, display: 'inline-block' }}>
                    <Spark />
                  </span>
                  {look.match}% match
                </span>
                <button className="worebtn" onClick={() => setShowSignup(true)}>
                  <Heart size={14} /> Save look
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* sample closet peek */}
      <div className="pad" style={{ marginTop: 10 }}>
        <div className="sec-t">Your sample closet</div>
        <div className="grid2">
          {DEMO_ITEMS.map((it) => (
            <div className="icard" key={it.id} style={{ cursor: 'default' }}>
              <div className="thumb" style={{ background: `${colorHex(it.colors)}22` }}>
                <Glyph category={it.category} subcategory={it.subcategory} color={colorHex(it.colors)} className="cut" />
              </div>
              <div className="meta">
                <div className="nm">{it.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* bottom CTA */}
      <div className="pad" style={{ marginTop: 18 }}>
        <div className="try-cta">
          <div className="h2 serif" style={{ marginBottom: 4 }}>
            Ready to style <em style={{ fontStyle: 'italic' }}>your</em> wardrobe?
          </div>
          <p className="dim" style={{ fontSize: 14, margin: '0 0 14px' }}>
            Add your clothes and Spark builds outfits from what you already own.
          </p>
          <Link href="/signup" className="btn">
            Create your free account <ArrowRight size={18} strokeWidth={2.2} />
          </Link>
          <p className="tiny dim" style={{ textAlign: 'center', marginTop: 10 }}>
            Already a member?{' '}
            <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
      <div style={{ height: 24 }} />

      {/* signup nudge modal */}
      {showSignup && (
        <div className="add-overlay" onClick={() => setShowSignup(false)}>
          <div className="add-card" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 60, height: 60, borderRadius: 20, background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff',
              }}
            >
              <Check size={30} strokeWidth={2.4} />
            </div>
            <div className="t">Like what Spark picked?</div>
            <p className="d" style={{ margin: '6px 0 18px' }}>
              Sign up to save looks and style the clothes you actually own — it&apos;s free.
            </p>
            <Link href="/signup" className="btn">
              Create free account
            </Link>
            <button
              className="btn btn--ghost"
              style={{ marginTop: 10 }}
              onClick={() => setShowSignup(false)}
            >
              Keep exploring
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
