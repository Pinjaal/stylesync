import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // a cold Space ping can take a while

export async function GET(req: Request) {
  // If you set CRON_SECRET, require Vercel's auto-sent auth header
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const url = process.env.PROCESSOR_URL
  if (!url) return NextResponse.json({ error: 'PROCESSOR_URL not set' }, { status: 500 })

  try {
    const res = await fetch(`${url}/`, { signal: AbortSignal.timeout(50_000) })
    return NextResponse.json({ ok: res.ok, status: res.status })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'ping failed' })
  }
}