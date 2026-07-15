// Lightweight in-process rate limiter. Keyed by client identifier (usually IP).
//
// NOTE: This is per-instance memory, so on a multi-instance serverless
// deployment (Vercel) each lambda keeps its own counters — it slows abuse but
// is not a globally-consistent limit. It's a cheap, dependency-free first line
// of defence for the free-tier stack; swap in Upstash/Redis if we need hard,
// cross-instance guarantees.

interface Window {
  count: number
  resetAt: number
}

const buckets = new Map<string, Window>()

// Best-effort cleanup so the map can't grow unbounded across a long-lived
// instance. Runs lazily on each check.
function sweep(now: number) {
  if (buckets.size < 5000) return
  for (const [key, win] of buckets) {
    if (win.resetAt <= now) buckets.delete(key)
  }
}

export interface RateLimitResult {
  ok: boolean
  retryAfter: number // seconds until the window resets
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)
  const win = buckets.get(key)
  if (!win || win.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  win.count += 1
  if (win.count > limit) {
    return { ok: false, retryAfter: Math.ceil((win.resetAt - now) / 1000) }
  }
  return { ok: true, retryAfter: 0 }
}

// Extracts a best-effort client identifier from proxy headers. Falls back to a
// constant so a missing header degrades to a shared (stricter) bucket rather
// than bypassing the limit entirely.
export function clientKey(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}
