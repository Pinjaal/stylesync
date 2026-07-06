// Derives a "Style DNA" identity from onboarding answers.
// Pure + dependency-free so it can run on the client (instant reveal) and the
// server (persisted to profiles.style_preferences and fed to Spark).

export interface StylePreferences {
  ageGroup?: string
  vibes?: string[]
  occasions?: string[]
  colors?: string[]
  styleDna?: StyleDna
}

export interface StyleDna {
  title: string
  description: string
}

const DNA_BY_VIBE: Record<string, StyleDna> = {
  Minimal: {
    title: 'Minimal Muse',
    description:
      'Clean lines, warm neutrals, one considered statement. Spark will build your outfits around it.',
  },
  Streetwear: {
    title: 'Street Editor',
    description:
      'Relaxed silhouettes with a sharp city edge. Comfort first, always a little cool.',
  },
  Classic: {
    title: 'Timeless Classic',
    description:
      'Tailored staples that never date. Quiet quality over trend.',
  },
  Boho: {
    title: 'Free Spirit',
    description:
      'Easy layers, earthy tones and effortless movement. Relaxed but intentional.',
  },
  Edgy: {
    title: 'Bold Maverick',
    description:
      'High-contrast and confident, with a rebellious streak. You lead with a statement.',
  },
  Coquette: {
    title: 'Soft Romantic',
    description:
      'Delicate details and a playful sweetness. Feminine, with a wink.',
  },
  Y2K: {
    title: 'Nostalgia Pop',
    description:
      'Playful throwback energy reworked for now. Fun over fussy.',
  },
  'Ethnic fusion': {
    title: 'Fusion Muse',
    description:
      'Where heritage meets everyday modern. Rich detail, wearable balance.',
  },
}

export function computeStyleDna(vibes: string[] = []): StyleDna {
  for (const v of vibes) {
    if (DNA_BY_VIBE[v]) return DNA_BY_VIBE[v]
  }
  return {
    title: 'Style Explorer',
    description:
      'Still defining your signature — Spark will learn your taste as you wear and rate outfits.',
  }
}

// Short human labels for the reveal / profile chips.
export function dnaChips(prefs: StylePreferences): string[] {
  const chips: string[] = []
  for (const v of prefs.vibes ?? []) chips.push(v)
  if (prefs.occasions?.length) chips.push(prefs.occasions.slice(0, 3).join(' · '))
  return chips.slice(0, 6)
}
