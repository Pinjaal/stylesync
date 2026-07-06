// Best-effort mapping of Gemini's free-text colour names to a hex swatch,
// used for the little colour dot and garment-glyph tint in the closet.
const MAP: Record<string, string> = {
  black: '#2e2a2e',
  white: '#f1ede7',
  cream: '#e7dcc7',
  ivory: '#efe7d8',
  beige: '#d8c7a8',
  tan: '#c9a66b',
  camel: '#c9a66b',
  brown: '#7a5a44',
  khaki: '#9d8c6b',
  grey: '#8b8288',
  gray: '#8b8288',
  charcoal: '#4a4a52',
  navy: '#34435e',
  blue: '#5f7da6',
  'light blue': '#8fa9c4',
  denim: '#4a6079',
  teal: '#3b7d7d',
  green: '#6f8c5c',
  sage: '#9dae8c',
  olive: '#7d7a3a',
  red: '#b23a3a',
  maroon: '#7e3b4c',
  burgundy: '#6e2a3d',
  berry: '#b8395a',
  pink: '#e3b5b0',
  blush: '#e6c3bd',
  rose: '#c98a8a',
  purple: '#6e4a7a',
  lavender: '#a99cc4',
  yellow: '#d6a94c',
  mustard: '#c9962f',
  gold: '#dba23a',
  orange: '#d1863f',
  rust: '#a5562d',
}

export function colorHex(colors?: string[] | null): string {
  if (!colors?.length) return '#b09a86'
  const raw = colors[0].toLowerCase().trim()
  if (MAP[raw]) return MAP[raw]
  // try the last word (e.g. "dark blue" → "blue")
  const word = raw.split(/\s+/).pop() as string
  return MAP[word] ?? '#b09a86'
}
