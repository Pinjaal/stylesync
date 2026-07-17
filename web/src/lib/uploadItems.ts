'use client'

import { createClient } from '@/lib/supabase/client'
import { imageFileError, safeImageExt } from '@/lib/imageValidation'

const BUCKET = 'wardrobe'

export interface UploadCallbacks {
  onProgress?: (done: number, total: number) => void
  onError?: (message: string) => void
}

// Uploads raw images to Storage then asks the server to process each one
// (background removal + Gemini tagging + DB insert). Shared by the closet
// "Add" button and the global nav FAB so "add from anywhere" actually works.
export async function uploadItems(files: File[], cb: UploadCallbacks = {}): Promise<string[]> {
  const created: string[] = []
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    cb.onError?.('Not logged in')
    return created
  }

  cb.onProgress?.(0, files.length)

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const badFile = imageFileError(file)
      if (badFile) throw new Error(badFile)
      const itemId = crypto.randomUUID()
      const ext = safeImageExt(file.name)
      const rawKey = `${user.id}/raw/${itemId}.${ext}`

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(rawKey, file, {
          contentType: file.type || 'image/jpeg',
          upsert: false,
        })
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

      const res = await fetch('/api/items/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawKey, itemId }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error || `Process failed (${res.status})`)
      }

      created.push(itemId)
      cb.onProgress?.(i + 1, files.length)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      cb.onError?.(`Item ${i + 1}: ${msg}`)
      // keep going with the rest of the batch
    }
  }
  return created
}
