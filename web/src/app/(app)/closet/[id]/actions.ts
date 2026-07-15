'use server'

import { createClient } from '@/lib/supabase/server'
import { deleteFromStorage } from '@/lib/storage'
import { revalidatePath } from 'next/cache'

export async function markWorn(itemId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_item_worn', { p_item_id: itemId })
  if (error) {
    console.error('markWorn error:', error)
    throw new Error('Could not update item')
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
  if (error) {
    console.error('deleteItem lookup error:', error)
    throw new Error('Could not delete item')
  }

  const keys = [item.raw_image_key, item.cleaned_image_key, item.thumbnail_key]
    .filter((k): k is string => Boolean(k))
  await deleteFromStorage(keys) // frees Storage quota; safe on empty array

  const { error: delErr } = await supabase.from('items').delete().eq('id', itemId)
  if (delErr) {
    console.error('deleteItem delete error:', delErr)
    throw new Error('Could not delete item')
  }

  revalidatePath('/closet')
}