'use server'

import { createClient } from '@/lib/supabase/server'
import { deleteFromStorage } from '@/lib/storage'
import { revalidatePath } from 'next/cache'

export async function markWorn(itemId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_item_worn', { p_item_id: itemId })
  if (error) throw new Error(error.message)

  revalidatePath('/closet')
  revalidatePath(`/closet/${itemId}`)
}

// Vocabularies mirror the tagger's prompt (lib/gemini.ts SYSTEM) so hand edits and
// AI tags stay in the same language. They are guidance there and free text in the DB,
// so real rows may hold off-vocabulary values (e.g. the OpenRouter fallback writes
// category 'other') — the UI must offer the current value even when it isn't listed.
export const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'footwear', 'accessory', 'ethnic']
export const OCCASIONS = ['casual', 'work', 'party', 'formal', 'gym', 'travel', 'ethnic', 'date', 'beach', 'loungewear']
export const SEASONS = ['summer', 'winter', 'monsoon', 'all-season']

export interface ItemPatch {
  name?: string | null
  category?: string | null
  occasions?: string[]
  seasons?: string[]
}

/**
 * Update an item's user-editable fields. `name` is display-only — category and
 * subcategory remain the machine-owned tags that drive bucketing.
 *
 * NOTE the .select('id') guard: the base schema (items + its RLS policies) is not in
 * this repo, so an UPDATE policy may not exist. Postgres returns a 0-row update as
 * SUCCESS, not an error, which would make Save silently do nothing. Requiring a row
 * back turns that into a visible failure.
 */
export async function updateItem(itemId: string, patch: ItemPatch) {
  const supabase = await createClient()

  const clean: Record<string, unknown> = {}
  if (patch.name !== undefined) {
    const n = patch.name?.trim()
    clean.name = n ? n.slice(0, 80) : null // empty -> null, so it falls back to the tag
  }
  if (patch.category !== undefined) clean.category = patch.category?.trim() || null
  if (patch.occasions !== undefined) clean.occasions = [...new Set(patch.occasions)]
  if (patch.seasons !== undefined) clean.seasons = [...new Set(patch.seasons)]
  if (Object.keys(clean).length === 0) return

  const { data, error } = await supabase
    .from('items')
    .update(clean)
    .eq('id', itemId) // RLS scopes to the owner, matching the rest of this file
    .select('id')

  if (error) {
    if (/column .*name/i.test(error.message)) {
      throw new Error('Run migration 0005_item_name.sql in Supabase to enable naming.')
    }
    throw new Error(error.message)
  }
  if (!data || data.length === 0) {
    throw new Error("Couldn't save — this piece isn't editable on your account.")
  }

  revalidatePath('/closet')
  revalidatePath(`/closet/${itemId}`)
}

export async function deleteItem(itemId: string) {
  const supabase = await createClient()

  // RLS scopes this to the caller's own item; .single() errors if it's not theirs.
  const { data: item, error } = await supabase
    .from('items')
    .select('raw_image_key, cleaned_image_key, thumbnail_key')
    .eq('id', itemId)
    .single()
  if (error) throw new Error(error.message)

  const keys = [item.raw_image_key, item.cleaned_image_key, item.thumbnail_key]
    .filter((k): k is string => Boolean(k))
  await deleteFromStorage(keys) // frees Storage quota; safe on empty array

  const { error: delErr } = await supabase.from('items').delete().eq('id', itemId)
  if (delErr) throw new Error(delErr.message)

  revalidatePath('/closet')
}