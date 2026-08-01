import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { downloadFromStorage, uploadToStorage, deleteFromStorage } from '@/lib/storage'
import { extractAttributes, generateProductImage, embedText, itemEmbedText } from '@/lib/gemini'
import { MAX_IMAGE_BYTES, sniffedImageType } from '@/lib/imageValidation'

// Vercel hobby tier caps server functions at 60s. Generative extraction (nano
// banana) + Gemini tagging + embedding can add up, so we ask for the full window.
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

    // 2. Extraction: nano banana regenerates a clean product photo of the
    //    garment. If generation fails, fall back to the user's raw photo
    //    (normalised to PNG, EXIF-rotated) so an upload never breaks — worst
    //    case the stored image is the as-worn photo until it's re-processed.
    let cleanedImage: Buffer
    try {
      cleanedImage = await generateProductImage(rawImage)
    } catch (e) {
      console.warn(
        'nano banana extraction failed, using raw photo:',
        e instanceof Error ? e.message : e,
      )
      cleanedImage = await sharp(rawImage).rotate().png().toBuffer()
    }

    // 3. Upload the cleaned PNG to storage
    const cleanedKey = `${user.id}/cleaned/${itemId}.png`
    await uploadToStorage(cleanedKey, cleanedImage, 'image/png')

    // 4. Send the cleaned PNG to Gemini for structured attributes
    const attrs = await extractAttributes(cleanedImage)

    // Gate: if the vision model decided this isn't a wearable item, reject it and
    // clean up the storage we wrote so a stray upload doesn't leave orphans.
    if (!attrs.is_clothing) {
      await deleteFromStorage([rawKey, cleanedKey])
      return NextResponse.json(
        {
          error:
            attrs.reject_reason ||
            "That doesn't look like a clothing item — try a clear photo of a single garment.",
          notClothing: true,
        },
        { status: 422 },
      )
    }

    // 5. Embed the garment's text description (768-dim, Gemini) — this is the
    // search vector. Best-effort: if it fails the item still saves and stays
    // searchable via its tags, just without semantic ranking.
    let embedding: number[] | null = null
    try {
      embedding = await embedText(itemEmbedText(attrs))
    } catch (e) {
      console.warn('items/process embedText failed (saving without vector):', e instanceof Error ? e.message : e)
    }

    // 6. Insert the row in the items table (RLS enforces user_id == auth.uid()).
    // is_clothing/reject_reason are gate signals, not columns — drop them.
    const { is_clothing: _ic, reject_reason: _rr, ...cols } = attrs
    const base = {
      id: itemId,
      user_id: user.id,
      raw_image_key: rawKey,
      cleaned_image_key: cleanedKey,
      ...cols,
    }
    let { error: insertError } = await supabase.from('items').insert({ ...base, embedding })
    // If the embedding is present but the row won't take it (e.g. the 768-dim
    // migration hasn't been applied yet), don't lose the upload — retry without
    // the vector rather than fail the user.
    if (insertError && embedding) {
      console.warn('insert with embedding failed, retrying without vector:', insertError.message)
      ;({ error: insertError } = await supabase.from('items').insert({ ...base, embedding: null }))
    }
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