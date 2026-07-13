'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Users, User, Plus } from 'lucide-react'
import { Spark } from '@/components/Spark'
import { LoginPrompt } from '@/components/LoginPrompt'
import { uploadItems } from '@/lib/uploadItems'

const STAGES = ['Removing the background…', 'Tagging with AI…', 'Saving to your closet…']

export function BottomNav({ isGuest = false }: { isGuest?: boolean }) {
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
          onClick={() => (isGuest ? setPrompt(true) : inputRef.current?.click())}
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
