import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { downloadFromStorage, uploadToStorage } from '@/lib/storage'
import { processImage } from '@/lib/processor'
import { extractAttributes } from '@/lib/gemini'
import { MAX_IMAGE_BYTES, sniffedImageType } from '@/lib/imageValidation'

// Vercel hobby tier caps server functions at 60s. HF Space cold start
// + Gemini together can take 30-50s, so we ask for the full window.
export const maxDuration = 60

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // --- Parse + validate body ---
  let body: { rawKey?: string; itemId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { rawKey, itemId } = body
  if (!rawKey || !itemId) {
    return NextResponse.json(
      { error: 'rawKey and itemId are required' },
      { status: 400 },
    )
  }
  if (!UUID_RE.test(itemId)) {
    return NextResponse.json({ error: 'Invalid itemId' }, { status: 400 })
  }
  // Defence in depth: enforce path prefix matches the authed user
  if (!rawKey.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // 1. Download the raw image from storage (server-side, service role)
    const rawImage = await downloadFromStorage(rawKey)

    // Validate what we actually got before spending compute on it: enforce a
    // size ceiling and confirm the bytes are a real image (magic-byte sniff),
    // so a spoofed content-type or oversized blob can't drive processing.
    if (rawImage.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image is too large' }, { status: 413 })
    }
    if (!sniffedImageType(rawImage)) {
      return NextResponse.json({ error: 'Unsupported or invalid image file' }, { status: 415 })
    }

    // 2. Send to HF Space — get cleaned PNG + 512-dim embedding back
    const { cleanedImage, embedding } = await processImage(rawImage)

    // 3. Upload the cleaned PNG to storage
    const cleanedKey = `${user.id}/cleaned/${itemId}.png`
    await uploadToStorage(cleanedKey, cleanedImage, 'image/png')

    // 4. Send the cleaned PNG to Gemini for structured attributes
    const attrs = await extractAttributes(cleanedImage)

    // 5. Insert the row in the items table (RLS enforces user_id == auth.uid())
    const { error: insertError } = await supabase.from('items').insert({
      id: itemId,
      user_id: user.id,
      raw_image_key: rawKey,
      cleaned_image_key: cleanedKey,
      ...attrs,
      embedding,
    })
    if (insertError) {
      console.error('items/process DB insert error:', insertError)
      return NextResponse.json({ error: 'Could not save item' }, { status: 500 })
    }

    return NextResponse.json({ itemId, ok: true })
  } catch (err) {
    console.error('items/process error:', err)
    return NextResponse.json({ error: 'Could not process image' }, { status: 500 })
  }
}