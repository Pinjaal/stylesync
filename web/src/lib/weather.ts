import 'server-only'

/**
 * Current conditions via Open-Meteo — free, no API key, no billing.
 *
 * Why not profiles.city: the column exists but NOBODY has one set, so city-based
 * lookup would be dead on arrival. Vercel injects approximate geo headers on every
 * request instead, which needs no permission prompt and no extra UI. Locally those
 * headers don't exist, so weather is simply null and the stylist behaves as before.
 *
 * Privacy: coordinates are rounded to ~2dp (about 1km) before leaving our server,
 * which is far more precision than weather needs and less identifying. Nothing is
 * stored beyond the resulting conditions on the outfit row.
 */

export interface WeatherNow {
  tempC: number
  label: string
  rain: boolean
}

// WMO weather codes → plain English. Grouped, because the stylist only needs to
// know "is it wet / hot / cold", not the exact classification.
function describe(code: number): { label: string; rain: boolean } {
  if (code === 0) return { label: 'clear', rain: false }
  if (code <= 3) return { label: 'partly cloudy', rain: false }
  if (code <= 48) return { label: 'foggy', rain: false }
  if (code <= 57) return { label: 'drizzle', rain: true }
  if (code <= 65) return { label: 'rain', rain: true }
  if (code <= 67) return { label: 'freezing rain', rain: true }
  if (code <= 77) return { label: 'snow', rain: false }
  if (code <= 82) return { label: 'rain showers', rain: true }
  if (code <= 86) return { label: 'snow showers', rain: false }
  return { label: 'thunderstorms', rain: true }
}

// Serverless instances are short-lived, but a warm one serves many requests —
// this keeps a burst of reloads from hammering Open-Meteo.
const TTL_MS = 30 * 60 * 1000
const cache = new Map<string, { at: number; value: WeatherNow | null }>()

export async function getWeather(lat: number, lon: number): Promise<WeatherNow | null> {
  const la = lat.toFixed(2)
  const lo = lon.toFixed(2)
  const key = `${la},${lo}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}` +
      `&current=temperature_2m,weather_code`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) throw new Error(`open-meteo ${res.status}`)
    const j = (await res.json()) as { current?: { temperature_2m?: number; weather_code?: number } }
    const t = j.current?.temperature_2m
    const c = j.current?.weather_code
    if (typeof t !== 'number' || typeof c !== 'number') throw new Error('bad payload')
    const d = describe(c)
    const value: WeatherNow = { tempC: Math.round(t), label: d.label, rain: d.rain }
    cache.set(key, { at: Date.now(), value })
    return value
  } catch {
    // Weather is a bonus signal — never fail a recommendation over it.
    cache.set(key, { at: Date.now(), value: null })
    return null
  }
}

/** Approximate coords from Vercel's edge geo headers. Null locally / when absent. */
export function coordsFromRequest(req: Request): { lat: number; lon: number } | null {
  const lat = Number(req.headers.get('x-vercel-ip-latitude'))
  const lon = Number(req.headers.get('x-vercel-ip-longitude'))
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat === 0 && lon === 0) return null
  return { lat, lon }
}
