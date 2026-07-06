// Deterministic avatar colours from a user id — warm editorial palette.
const PAIRS: { bg: string; color: string }[] = [
  { bg: '#C9B6F0', color: '#4A3B6B' },
  { bg: '#C7D0BC', color: '#4C5A41' },
  { bg: '#D8B7A4', color: '#7A5638' },
  { bg: '#9DB3C8', color: '#34435E' },
  { bg: '#E68C79', color: '#7A2F22' },
  { bg: '#F0D48A', color: '#7A5B12' },
]

export function avatarColors(id: string): { bg: string; color: string } {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff
  return PAIRS[h % PAIRS.length]
}

export function initialOf(name: string | null | undefined): string {
  return (name?.trim()?.[0] ?? '?').toUpperCase()
}

// "2h", "3d", "just now"
export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'now'
  const m = s / 60
  if (m < 60) return `${Math.floor(m)}m`
  const h = m / 60
  if (h < 24) return `${Math.floor(h)}h`
  const d = h / 24
  if (d < 7) return `${Math.floor(d)}d`
  return `${Math.floor(d / 7)}w`
}
