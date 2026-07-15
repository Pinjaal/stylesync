'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Users, User, Plus } from 'lucide-react'
import { Spark } from '@/components/Spark'
import { LoginPrompt } from '@/components/LoginPrompt'
import { uploadItems } from '@/lib/uploadItems'

const STAGES = ['Removing the background…', 'Tagging with AI…', 'Saving to your closet…']

export interface NavMe {
  name: string
  initial: string
  bg: string
  fg: string
  subtitle: string
}

/**
 * The app's navigation shell. Renders the desktop sidebar, the page slot and the
 * mobile bottom bar from ONE component so they share a single upload flow — the
 * sidebar's "Add a piece" and the mobile FAB are literally the same handler.
 * Which nav is visible is decided purely by CSS (see the >=1024px block in
 * globals.css); below 1024px the sidebar is display:none and nothing changes.
 */
export function AppNav({
  isGuest = false,
  me = null,
  children,
}: {
  isGuest?: boolean
  me?: NavMe | null
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState(0)
  const [prompt, setPrompt] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current)
  }, [])

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  // Only the closet GRID wants the full-width column (4-col masonry). /closet/[id]
  // is an item detail — it must not inherit that, or the hero band and stat cards
  // stretch across the whole column.
  const pageClass =
    pathname === '/closet' ? ' page-closet' : isActive('/closet') ? ' page-item' : ''

  const addPiece = () => (isGuest ? setPrompt(true) : inputRef.current?.click())

  async function handleFiles(files: File[]) {
    setBusy(true)
    setStage(0)
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      1500,
    )
    const ids = await uploadItems(files)
    if (timer.current) clearInterval(timer.current)
    setBusy(false)
    if (files.length === 1 && ids.length === 1) {
      router.push(`/closet/${ids[0]}?added=1`)
    } else {
      router.push('/closet')
    }
    router.refresh()
  }

  return (
    <>
      <aside className="sidenav">
        <div className="sidenav-brand">
          <span className="sidenav-mark">
            <Spark />
          </span>
          <span className="sidenav-word">StyleSync</span>
        </div>

        <Link href="/closet" className={`sidenav-item${isActive('/closet') ? ' on' : ''}`}>
          <Home strokeWidth={1.9} />
          Closet
        </Link>
        <Link href="/outfit" className={`sidenav-item${isActive('/outfit') ? ' on' : ''}`}>
          <Spark filled={false} />
          Style
        </Link>
        <Link href="/community" className={`sidenav-item${isActive('/community') ? ' on' : ''}`}>
          <Users strokeWidth={1.9} />
          Community
        </Link>
        <Link href="/profile" className={`sidenav-item${isActive('/profile') ? ' on' : ''}`}>
          <User strokeWidth={1.9} />
          You
        </Link>

        <div className="sidenav-spacer" />

        <button className="sidenav-add" onClick={addPiece} disabled={busy}>
          <Plus strokeWidth={2.4} /> Add a piece
        </button>

        {me ? (
          <Link href="/profile" className="sidenav-me">
            <span className="sidenav-av" style={{ background: me.bg, color: me.fg }}>
              {me.initial}
            </span>
            <span className="sidenav-who">
              <span className="nm">{me.name}</span>
              <span className="sub">{me.subtitle}</span>
            </span>
          </Link>
        ) : (
          <Link href="/login" className="sidenav-me">
            <span className="sidenav-av" style={{ background: 'var(--lav)', color: '#4a3b6b' }}>
              ?
            </span>
            <span className="sidenav-who">
              <span className="nm">Guest</span>
              <span className="sub">Log in to save your closet</span>
            </span>
          </Link>
        )}
      </aside>

      <main className={`app-scroll${pageClass}`}>{children}</main>

      <nav className="bottomnav">
        <Link href="/closet" className={`navb${isActive('/closet') ? ' on' : ''}`}>
          <Home strokeWidth={1.9} />
          <span>Closet</span>
        </Link>
        <Link href="/outfit" className={`navb${isActive('/outfit') ? ' on' : ''}`}>
          <Spark filled={false} />
          <span>Style</span>
        </Link>

        <button
          className="navfab"
          onClick={addPiece}
          disabled={busy}
          aria-label="Add a piece"
        >
          <Plus strokeWidth={2.4} />
        </button>

        <Link href="/community" className={`navb${isActive('/community') ? ' on' : ''}`}>
          <Users strokeWidth={1.9} />
          <span>Community</span>
        </Link>
        <Link href="/profile" className={`navb${isActive('/profile') ? ' on' : ''}`}>
          <User strokeWidth={1.9} />
          <span>You</span>
        </Link>
      </nav>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const fileList = e.target.files
          if (fileList && fileList.length > 0) {
            const files = Array.from(fileList)
            e.target.value = ''
            handleFiles(files)
          }
        }}
      />

      {busy && (
        <div className="add-overlay">
          <div className="add-card">
            <Spark className="spin" />
            <div className="t">Adding your piece</div>
            <div className="d">{STAGES[stage]}</div>
          </div>
        </div>
      )}

      <LoginPrompt
        open={prompt}
        onClose={() => setPrompt(false)}
        title="Log in to add clothes"
        message="Sign up to upload your wardrobe and get outfits styled from your own pieces."
      />
    </>
  )
}
