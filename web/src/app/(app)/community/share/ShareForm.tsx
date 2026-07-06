'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { ImagePlus, Loader2, ShoppingBag } from 'lucide-react'
import { Glyph } from '@/components/Glyph'
import { colorHex } from '@/lib/colors'
import { createClient } from '@/lib/supabase/client'
import { createPost } from '../actions'
import type { ShareLook } from '../data'

const BUCKET = 'wardrobe'

export function ShareForm({
  uid,
  looks,
  challenges,
  preChallenge,
}: {
  uid: string
  looks: ShareLook[]
  challenges: { id: string; tag: string }[]
  preChallenge: string | null
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [outfitId, setOutfitId] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [challengeId, setChallengeId] = useState<string | null>(preChallenge)
  const [tagCloset, setTagCloset] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()

  function pickPhoto(f: File) {
    setPhoto(f)
    setPreview(URL.createObjectURL(f))
    setOutfitId(null) // photo and look are mutually exclusive
  }

  async function share() {
    setError(null)
    if (!photo && !outfitId) {
      setError('Add a photo or pick a logged look')
      return
    }
    setBusy(true)
    try {
      let imageKey: string | undefined
      if (photo) {
        const supabase = createClient()
        const ext = (photo.name.split('.').pop() || 'jpg').toLowerCase()
        imageKey = `${uid}/posts/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(imageKey, photo, { contentType: photo.type || 'image/jpeg', upsert: false })
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
      }
      start(async () => {
        try {
          await createPost({
            imageKey,
            outfitId: outfitId ?? undefined,
            caption,
            challengeId,
            tagCloset,
          })
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not share')
          setBusy(false)
        }
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not share')
      setBusy(false)
    }
  }

  return (
    <>
      <div className="share-head">
        <Link href="/community" className="cancel">
          Cancel
        </Link>
        <h2>Share your fit</h2>
        <div style={{ width: 52 }} />
      </div>

      <button className="share-drop" onClick={() => fileRef.current?.click()}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Your fit" />
        ) : (
          <>
            <ImagePlus />
            <span>Add your OOTD</span>
          </>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) pickPhoto(f)
          e.target.value = ''
        }}
      />

      {looks.length > 0 && (
        <div className="logged-row">
          <span className="lbl">Or a logged look:</span>
          {looks.map((l) => {
            const on = outfitId === l.outfitId
            return (
              <button
                key={l.outfitId}
                className={`logged-look${on ? ' on' : ''}`}
                onClick={() => {
                  setOutfitId(on ? null : l.outfitId)
                  if (!on) {
                    setPhoto(null)
                    setPreview(null)
                  }
                }}
              >
                <div className="grid">
                  {l.items.slice(0, 4).map((it) =>
                    it.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={it.id} src={it.imageUrl} alt="" />
                    ) : (
                      <span key={it.id} style={{ background: `${colorHex(it.colors)}55`, display: 'flex' }}>
                        <Glyph category={it.category} subcategory={it.subcategory} color={colorHex(it.colors)} />
                      </span>
                    ),
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="share-cap">
        <input
          placeholder="This week's rotation…"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </div>

      {challenges.length > 0 && (
        <>
          <div className="today-label">Add to a challenge</div>
          <div className="quickchips" style={{ marginBottom: 16 }}>
            {challenges.map((c) => (
              <button
                key={c.id}
                className={`qchip${challengeId === c.id ? ' on' : ''}`}
                onClick={() => setChallengeId((cur) => (cur === c.id ? null : c.id))}
              >
                #{c.tag} {challengeId === c.id ? '✓' : ''}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="toggle-row">
        <div className="lft">
          <ShoppingBag size={17} />
          Tag my closet pieces
        </div>
        <button
          className={`switch${tagCloset ? ' on' : ''}`}
          onClick={() => setTagCloset((v) => !v)}
          aria-label="Tag closet pieces"
        >
          <span className="knob" />
        </button>
      </div>

      {error && <p className="alert" style={{ margin: '0 22px 12px' }}>{error}</p>}

      <div className="pad">
        <button className="btn" onClick={share} disabled={busy}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : 'Share to community'}
        </button>
      </div>
      <div style={{ height: 16 }} />
    </>
  )
}
