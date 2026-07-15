import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getItemDetail } from '@/app/(app)/closet/[id]/data'

// Feeds the desktop closet detail rail. Shares getItemDetail() with the full
// /closet/[id] page so the rail and the page can never drift apart.
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  try {
    const detail = await getItemDetail(id)
    if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(detail)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load item'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
