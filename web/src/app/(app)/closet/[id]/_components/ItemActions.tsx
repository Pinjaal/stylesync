'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, Check, Loader2 } from 'lucide-react'
import { Spark } from '@/components/Spark'
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
    if (!window.confirm('Remove this piece from your closet?')) return
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
    <>
      {error && (
        <p className="alert" style={{ margin: '0 22px 8px' }}>
          {error}
        </p>
      )}
      <div className="idfoot">
        <Link href="/outfit" className="btn">
          <Spark /> Style this piece
        </Link>
        <button
          type="button"
          className="square"
          onClick={handleWorn}
          disabled={pending}
          aria-label="I wore this today"
          title="I wore this today"
          style={wornJustNow ? { borderColor: 'var(--sage)', color: 'var(--sage)' } : undefined}
        >
          {pending ? <Loader2 size={18} className="animate-spin" /> : <Check size={19} strokeWidth={2.2} />}
        </button>
        <button
          type="button"
          className="square"
          onClick={handleDelete}
          disabled={pending}
          aria-label="Remove from closet"
          title="Remove from closet"
          style={{ color: 'var(--accent)', borderColor: 'rgba(238,65,39,.3)' }}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </>
  )
}
