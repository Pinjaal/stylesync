'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')
  return { supabase, user }
}

export async function toggleLike(postId: string): Promise<boolean> {
  const { supabase, user } = await requireUser()
  const { data: existing } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
    return false
  }
  const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
  if (error && error.code === '42P01') {
    throw new Error('Community tables missing — run 0003_community.sql.')
  }
  return true
}

export async function toggleFollow(targetId: string): Promise<boolean> {
  const { supabase, user } = await requireUser()
  if (targetId === user.id) return false
  const { data: existing } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetId)
    return false
  }
  await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId })
  return true
}

export async function addComment(postId: string, body: string) {
  const { supabase, user } = await requireUser()
  const clean = body.trim()
  if (!clean) return
  const { error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: user.id, body: clean.slice(0, 500) })
  if (error) throw new Error(error.message)
  revalidatePath(`/community/post/${postId}`)
}

export interface CreatePostInput {
  imageKey?: string
  outfitId?: string
  caption: string
  challengeId?: string | null
  tagCloset?: boolean
}

export async function createPost(input: CreatePostInput) {
  const { supabase, user } = await requireUser()
  if (!input.imageKey && !input.outfitId) {
    throw new Error('Add a photo or pick a logged look')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('city')
    .eq('id', user.id)
    .maybeSingle()

  const { error } = await supabase.from('posts').insert({
    user_id: user.id,
    image_key: input.imageKey ?? null,
    outfit_id: input.outfitId ?? null,
    caption: input.caption.trim() || null,
    location: profile?.city ?? null,
    challenge_id: input.challengeId ?? null,
    tag_closet: input.tagCloset ?? false,
  })
  if (error) {
    if (error.code === '42P01') throw new Error('Community tables missing — run 0003_community.sql.')
    throw new Error(error.message)
  }

  revalidatePath('/community')
  redirect('/community')
}
