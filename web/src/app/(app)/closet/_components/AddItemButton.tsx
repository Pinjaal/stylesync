'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2 } from 'lucide-react'

const BUCKET = 'wardrobe'

export default function AddItemButton() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: File[])  {
    setError(null)
    setBusy(true)
    setProgress({ done: 0, total: files.length })

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Not logged in')
      setBusy(false)
      return
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const itemId = crypto.randomUUID()
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const rawKey = `${user.id}/raw/${itemId}.${ext}`

        // 1. Upload the raw file directly to Supabase Storage
        //    RLS policy enforces that the path starts with auth.uid()
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(rawKey, file, {
            contentType: file.type || 'image/jpeg',
            upsert: false,
          })
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

        // 2. Ask the server to process it (HF Space + Gemini + DB insert)
        const res = await fetch('/api/items/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawKey, itemId }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({} as { error?: string }))
          throw new Error(j.error || `Process failed (${res.status})`)
        }

        setProgress({ done: i + 1, total: files.length })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(`Item ${i + 1}: ${msg}`)
        // keep going with the rest of the batch
      }
    }

    setBusy(false)
    router.refresh() // re-fetch server-rendered closet so new items show up
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex items-center gap-1 bg-black text-white px-3 py-1.5 rounded-full text-sm hover:bg-gray-800 transition disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {progress ? `${progress.done}/${progress.total}` : 'Adding...'}
          </>
        ) : (
          <>
            <Plus size={16} />
            Add
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
        const fileList = e.target.files
        if (fileList && fileList.length > 0) {
          const files = Array.from(fileList) // snapshot — breaks the live reference
          e.target.value = ''
          handleFiles(files)
  }
}}
      />

      {error && (
        <div className="absolute right-4 top-16 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1 max-w-[280px]">
          {error}
        </div>
      )}
    </>
  )
}