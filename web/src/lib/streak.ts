// Styling streak + level, derived from the dates the user ACTIVELY styled.
// Callers must pass only user-initiated looks (outfits.source <> 'daily') — the
// once-a-day auto pick on the Style home is excluded, so merely opening the app
// never builds a streak. See api/recommend.

export interface StreakInfo {
  streak: number
  alive: boolean // did they already style today?
  level: number
  title: string
  looks: number
}

const TITLES = [
  'Newcomer',
  'Explorer',
  'Curator',
  'Tastemaker',
  'Trendsetter',
  'Style Icon',
  'Muse',
]

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}

export function computeStreak(isoDates: string[]): StreakInfo {
  const days = new Set(isoDates.map((s) => dayKey(new Date(s))))
  const looks = isoDates.length

  const today = new Date()
  const yesterday = new Date(today.getTime() - 86400000)
  const aliveToday = days.has(dayKey(today))

  // Start from today if active today, else yesterday (streak still standing).
  let cursor = aliveToday ? today : days.has(dayKey(yesterday)) ? yesterday : null
  let streak = 0
  while (cursor && days.has(dayKey(cursor))) {
    streak++
    cursor = new Date(cursor.getTime() - 86400000)
  }

  const level = Math.min(1 + Math.floor(looks / 5), TITLES.length)
  return {
    streak,
    alive: aliveToday,
    level,
    title: TITLES[level - 1],
    looks,
  }
}
