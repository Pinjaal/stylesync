import type { LookItem } from './LookCollage'

export interface Look {
  id: string | null
  title: string | null
  reasoning: string
  style_tips: string[]
  confidence: number | null
  items: LookItem[]
}

// Stable match % for the deck: use model confidence, else a pseudo score.
export function matchPct(look: Look): number {
  if (look.confidence != null) return Math.min(99, Math.max(60, Math.round(look.confidence * 100)))
  const key = look.id ?? look.title ?? look.reasoning
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xffff
  return 84 + (h % 15)
}
