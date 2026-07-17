'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SegmentSummary {
  id: string
  name: string
  color: string
  itemIds: string[]
}

// Loads the user's segments + their membership. Returns [] if the segments
// tables haven't been migrated yet, so the closet still renders.
export async function loadSegments(): Promise<SegmentSummary[]> {
  const supabase = await createClient()

  const { data: segs, error } = await supabase
    .from('segments')
    .select('id, name, color')
    .order('created_at', { ascending: false })
  if (error || !segs) return []

  const { data: members } = await supabase
    .from('segment_items')
    .select('segment_id, item_id')

  const byId = new Map<string, SegmentSummary>()
  for (const s of segs) {
    byId.set(s.id, { id: s.id, name: s.name, color: s.color ?? '#C4462F', itemIds: [] })
  }
  for (const m of members ?? []) {
    byId.get(m.segment_id)?.itemIds.push(m.item_id)
  }
  return [...byId.values()]
}

export async function createSegment(
  name: string,
  color: string,
  itemIds: string[],
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const clean = name.trim()
  if (!clean) throw new Error('Give your segment a name')

  const { data: seg, error } = await supabase
    .from('segments')
    .insert({ user_id: user.id, name: clean, color })
    .select('id')
    .single()
  if (error) {
    if (error.code === '42P01') {
      throw new Error('Segments table missing — run the 0002_segments.sql migration.')
    }
    console.error('createSegment error:', error)
    throw new Error('Could not create segment')
  }

  if (itemIds.length) {
    const { error: mErr } = await supabase
      .from('segment_items')
      .insert(itemIds.map((item_id) => ({ segment_id: seg.id, item_id })))
    if (mErr) {
      console.error('createSegment membership error:', mErr)
      throw new Error('Could not create segment')
    }
  }

  revalidatePath('/closet')
  return { id: seg.id as string }
}

export async function deleteSegment(segmentId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('segments').delete().eq('id', segmentId)
  if (error) {
    console.error('deleteSegment error:', error)
    throw new Error('Could not delete segment')
  }
  revalidatePath('/closet')
}
