import type { LookItem } from './LookCollage'

export interface Look {
  id: string | null
  title: string | null
  reasoning: string
  style_tips: string[]
  confidence: number | null
  items: LookItem[]
}

// The deck's match %. `confidence` is the server's personalized match (0..1) —
// the stylist's own confidence blended with how the user has responded to these
// pieces (see lib/metrics.ts outfitMatch). Returns null when there's no signal,
// so the UI hides the chip rather than showing an invented number (this used to
// hash the title into a fake 84-98%).
export function matchPct(look: Look): number | null {
  if (look.confidence == null) return null
  return Math.min(99, Math.max(55, Math.round(look.confidence * 100)))
}
