'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2 } from 'lucide-react'
import { addComment } from '../actions'

export function CommentBar({ postId, myInitial }: { postId: string; myInitial: string }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [pending, start] = useTransition()

  function submit() {
    const text = body.trim()
    if (!text) return
    setBody('')
    start(async () => {
      try {
        await addComment(postId, text)
        router.refresh()
      } catch {
        setBody(text)
      }
    })
  }

  return (
    <div className="commentbar">
      <div className="cav">{myInitial}</div>
      <input
        placeholder="Add a comment…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
      />
      <button className="send" onClick={submit} disabled={pending || !body.trim()} aria-label="Send">
        {pending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
      </button>
    </div>
  )
}
