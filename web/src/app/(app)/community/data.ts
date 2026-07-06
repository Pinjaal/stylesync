import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrls } from '@/lib/storage'
import { avatarColors, initialOf, timeAgo } from '@/lib/avatar'
import type { StylePreferences } from '@/lib/styleDna'
import type { LookItem } from '@/app/(app)/outfit/_components/LookCollage'

type DB = Awaited<ReturnType<typeof createClient>>

export interface Author {
  id: string
  name: string
  initial: string
  styleLabel: string
  location: string | null
  avatarBg: string
  avatarColor: string
  isFollowing: boolean
  isMe: boolean
}

export type PostMedia =
  | { kind: 'photo'; url: string | null }
  | { kind: 'look'; items: LookItem[] }

export interface FeedPost {
  id: string
  author: Author
  createdLabel: string
  media: PostMedia
  challengeTag: string | null
  challengeId: string | null
  caption: string | null
  likeCount: number
  commentCount: number
  likedByMe: boolean
}

interface ProfileRow {
  id: string
  display_name: string | null
  city: string | null
  style_preferences: StylePreferences | null
}

function styleLabel(p?: ProfileRow | null): string {
  if (!p) return 'StyleSync'
  return p.style_preferences?.styleDna?.title || p.style_preferences?.vibes?.[0] || 'StyleSync'
}

function authorFrom(p: ProfileRow | undefined, me: string, following: Set<string>): Author {
  const id = p?.id ?? 'unknown'
  const name = p?.display_name || 'Someone'
  const c = avatarColors(id)
  return {
    id,
    name,
    initial: initialOf(name),
    styleLabel: styleLabel(p),
    location: p?.city ?? null,
    avatarBg: c.bg,
    avatarColor: c.color,
    isFollowing: following.has(id),
    isMe: id === me,
  }
}

interface PostRow {
  id: string
  user_id: string
  image_key: string | null
  outfit_id: string | null
  caption: string | null
  challenge_id: string | null
  created_at: string
}

// Shared batched shaping: profiles, challenge tags, look items, signed urls,
// like/comment counts + my-likes — all fetched in bulk for a set of posts.
async function shapePosts(
  supabase: DB,
  rows: PostRow[],
  me: string,
  following: Set<string>,
): Promise<FeedPost[]> {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)

  const authorIds = [...new Set(rows.map((r) => r.user_id))]
  const outfitIds = [...new Set(rows.map((r) => r.outfit_id).filter(Boolean))] as string[]
  const challengeIds = [...new Set(rows.map((r) => r.challenge_id).filter(Boolean))] as string[]

  const [profilesRes, outfitsRes, challengesRes, likesRes, commentsRes] = await Promise.all([
    supabase.from('community_profiles').select('id, display_name, city, style_preferences').in('id', authorIds),
    outfitIds.length
      ? supabase.from('outfits').select('id, item_ids').in('id', outfitIds)
      : Promise.resolve({ data: [] as { id: string; item_ids: string[] }[] }),
    challengeIds.length
      ? supabase.from('challenges').select('id, tag').in('id', challengeIds)
      : Promise.resolve({ data: [] as { id: string; tag: string }[] }),
    supabase.from('post_likes').select('post_id, user_id').in('post_id', ids),
    supabase.from('post_comments').select('post_id').in('post_id', ids),
  ])

  const profiles = new Map((profilesRes.data ?? []).map((p) => [p.id, p as ProfileRow]))
  const challengeTag = new Map((challengesRes.data ?? []).map((c) => [c.id, c.tag]))

  // outfit -> item ids, then fetch all items
  const outfitItems = new Map<string, string[]>(
    (outfitsRes.data ?? []).map((o) => [o.id as string, (o.item_ids ?? []) as string[]]),
  )
  const allItemIds = [...new Set([...outfitItems.values()].flat())]
  const itemsRes = allItemIds.length
    ? await supabase
        .from('items')
        .select('id, category, subcategory, colors, cleaned_image_key')
        .in('id', allItemIds)
    : { data: [] as { id: string; category: string | null; subcategory: string | null; colors: string[] | null; cleaned_image_key: string | null }[] }
  const itemsById = new Map((itemsRes.data ?? []).map((it) => [it.id, it]))

  // sign every key (post photos + item cutouts) in one shot
  const keys = [
    ...rows.map((r) => r.image_key),
    ...(itemsRes.data ?? []).map((it) => it.cleaned_image_key),
  ].filter((k): k is string => Boolean(k))
  const urls = await getSignedUrls(keys)

  // like + comment tallies
  const likeCount = new Map<string, number>()
  const likedByMe = new Set<string>()
  for (const l of likesRes.data ?? []) {
    likeCount.set(l.post_id, (likeCount.get(l.post_id) ?? 0) + 1)
    if (l.user_id === me) likedByMe.add(l.post_id)
  }
  const commentCount = new Map<string, number>()
  for (const c of commentsRes.data ?? []) {
    commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1)
  }

  return rows.map((r) => {
    let media: PostMedia
    if (r.image_key) {
      media = { kind: 'photo', url: urls[r.image_key] ?? null }
    } else if (r.outfit_id) {
      const itemIds = outfitItems.get(r.outfit_id) ?? []
      const items: LookItem[] = itemIds
        .map((id) => itemsById.get(id))
        .filter(Boolean)
        .map((it) => ({
          id: it!.id,
          category: it!.category,
          subcategory: it!.subcategory,
          colors: it!.colors,
          imageUrl: it!.cleaned_image_key ? urls[it!.cleaned_image_key] ?? null : null,
        }))
      media = { kind: 'look', items }
    } else {
      media = { kind: 'photo', url: null }
    }

    return {
      id: r.id,
      author: authorFrom(profiles.get(r.user_id), me, following),
      createdLabel: timeAgo(r.created_at),
      media,
      challengeTag: r.challenge_id ? challengeTag.get(r.challenge_id) ?? null : null,
      challengeId: r.challenge_id,
      caption: r.caption,
      likeCount: likeCount.get(r.id) ?? 0,
      commentCount: commentCount.get(r.id) ?? 0,
      likedByMe: likedByMe.has(r.id),
    }
  })
}

async function followingSet(supabase: DB, me: string): Promise<Set<string>> {
  const { data } = await supabase.from('follows').select('following_id').eq('follower_id', me)
  return new Set((data ?? []).map((f) => f.following_id))
}

export interface ActiveChallenge {
  id: string
  tag: string
  title: string
  description: string | null
  grad: string
  daysLeft: number
  fits: number
}

function daysLeft(endsAt: string | null): number {
  if (!endsAt) return 0
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400000))
}

export async function getActiveChallenge(supabase: DB): Promise<ActiveChallenge | null> {
  const { data } = await supabase
    .from('challenges')
    .select('id, tag, title, description, grad, ends_at')
    .gt('ends_at', new Date().toISOString())
    .order('ends_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', data.id)
  return {
    id: data.id,
    tag: data.tag,
    title: data.title,
    description: data.description,
    grad: data.grad ?? '#4A6480,#2C3E50',
    daysLeft: daysLeft(data.ends_at),
    fits: count ?? 0,
  }
}

export async function getChallenges(supabase: DB) {
  const { data } = await supabase
    .from('challenges')
    .select('id, tag, ends_at')
    .gt('ends_at', new Date().toISOString())
    .order('ends_at', { ascending: true })
  return data ?? []
}

export interface Story {
  id: string
  name: string
  initial: string
  bg: string
  color: string
}

export async function getStories(supabase: DB): Promise<Story[]> {
  const { data } = await supabase
    .from('posts')
    .select('user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(40)
  const seen = new Set<string>()
  const uids: string[] = []
  for (const r of data ?? []) {
    if (!seen.has(r.user_id)) {
      seen.add(r.user_id)
      uids.push(r.user_id)
    }
    if (uids.length >= 10) break
  }
  if (!uids.length) return []
  const { data: profs } = await supabase
    .from('community_profiles')
    .select('id, display_name')
    .in('id', uids)
  const byId = new Map((profs ?? []).map((p) => [p.id, p]))
  return uids.map((id) => {
    const c = avatarColors(id)
    const name = byId.get(id)?.display_name || 'Someone'
    return { id, name, initial: initialOf(name), bg: c.bg, color: c.color }
  })
}

export async function getFeed(supabase: DB, me: string): Promise<FeedPost[]> {
  const { data } = await supabase
    .from('posts')
    .select('id, user_id, image_key, outfit_id, caption, challenge_id, created_at')
    .order('created_at', { ascending: false })
    .limit(30)
    .returns<PostRow[]>()
  const following = await followingSet(supabase, me)
  return shapePosts(supabase, data ?? [], me, following)
}

export interface PostComment {
  id: string
  authorName: string
  initial: string
  bg: string
  color: string
  body: string
  timeLabel: string
}

export interface PostDetail {
  post: FeedPost
  comments: PostComment[]
  shopItems: { id: string; label: string; url: string | null; color: string; category: string | null; subcategory: string | null }[]
}

export async function getPost(supabase: DB, me: string, postId: string): Promise<PostDetail | null> {
  const { data: row } = await supabase
    .from('posts')
    .select('id, user_id, image_key, outfit_id, caption, challenge_id, created_at')
    .eq('id', postId)
    .maybeSingle<PostRow>()
  if (!row) return null

  const following = await followingSet(supabase, me)
  const [post] = await shapePosts(supabase, [row], me, following)

  const { data: cRows } = await supabase
    .from('post_comments')
    .select('id, user_id, body, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(50)
  const cAuthorIds = [...new Set((cRows ?? []).map((c) => c.user_id))]
  const { data: cProfs } = cAuthorIds.length
    ? await supabase.from('community_profiles').select('id, display_name').in('id', cAuthorIds)
    : { data: [] as { id: string; display_name: string | null }[] }
  const cName = new Map((cProfs ?? []).map((p) => [p.id, p.display_name]))
  const comments: PostComment[] = (cRows ?? []).map((c) => {
    const col = avatarColors(c.user_id)
    const name = cName.get(c.user_id) || 'Someone'
    return {
      id: c.id,
      authorName: name,
      initial: initialOf(name),
      bg: col.bg,
      color: col.color,
      body: c.body,
      timeLabel: timeAgo(c.created_at),
    }
  })

  // shop-the-look: pieces in MY closet that match the post's look buckets
  const shopItems = await shopTheLook(supabase, post)

  return { post, comments, shopItems }
}

async function shopTheLook(supabase: DB, post: FeedPost) {
  const { bucketFor } = await import('@/components/Glyph')
  const { colorHex } = await import('@/lib/colors')
  const wantBuckets =
    post.media.kind === 'look'
      ? new Set(post.media.items.map((i) => bucketFor(i.category, i.subcategory)))
      : null

  const { data: mine } = await supabase
    .from('items')
    .select('id, category, subcategory, colors, cleaned_image_key')
    .eq('is_active', true)
    .order('times_worn', { ascending: false })
    .limit(30)
  let list = mine ?? []
  if (wantBuckets) list = list.filter((it) => wantBuckets.has(bucketFor(it.category, it.subcategory)))
  const picked = (list.length ? list : mine ?? []).slice(0, 3)
  const keys = picked.map((p) => p.cleaned_image_key).filter((k): k is string => Boolean(k))
  const urls = await getSignedUrls(keys)
  return picked.map((it) => ({
    id: it.id,
    label: it.subcategory || it.category || 'Piece',
    url: it.cleaned_image_key ? urls[it.cleaned_image_key] ?? null : null,
    color: colorHex(it.colors),
    category: it.category,
    subcategory: it.subcategory,
  }))
}

export interface ChallengeDetail {
  id: string
  tag: string
  title: string
  description: string | null
  grad: string
  daysLeft: number
  fits: number
  friendsIn: number
  entries: FeedPost[]
}

export async function getChallenge(
  supabase: DB,
  me: string,
  challengeId: string,
): Promise<ChallengeDetail | null> {
  const { data: ch } = await supabase
    .from('challenges')
    .select('id, tag, title, description, grad, ends_at')
    .eq('id', challengeId)
    .maybeSingle()
  if (!ch) return null

  const { data: rows } = await supabase
    .from('posts')
    .select('id, user_id, image_key, outfit_id, caption, challenge_id, created_at')
    .eq('challenge_id', challengeId)
    .order('created_at', { ascending: false })
    .limit(30)
    .returns<PostRow[]>()

  const following = await followingSet(supabase, me)
  const entries = await shapePosts(supabase, rows ?? [], me, following)
  // rough "trending" sort by likes
  entries.sort((a, b) => b.likeCount - a.likeCount)
  const friendsIn = new Set(
    (rows ?? []).map((r) => r.user_id).filter((u) => following.has(u)),
  ).size

  return {
    id: ch.id,
    tag: ch.tag,
    title: ch.title,
    description: ch.description,
    grad: ch.grad ?? '#4A6480,#2C3E50',
    daysLeft: daysLeft(ch.ends_at),
    fits: (rows ?? []).length,
    friendsIn,
    entries,
  }
}

export interface ShareLook {
  outfitId: string
  items: LookItem[]
}

export async function getShareData(supabase: DB) {
  const { data: outfits } = await supabase
    .from('outfits')
    .select('id, item_ids')
    .order('created_at', { ascending: false })
    .limit(8)
    .returns<{ id: string; item_ids: string[] }[]>()

  const allItemIds = [...new Set((outfits ?? []).flatMap((o) => o.item_ids))]
  const { data: items } = allItemIds.length
    ? await supabase
        .from('items')
        .select('id, category, subcategory, colors, cleaned_image_key')
        .in('id', allItemIds)
    : { data: [] as { id: string; category: string | null; subcategory: string | null; colors: string[] | null; cleaned_image_key: string | null }[] }
  const itemsById = new Map((items ?? []).map((it) => [it.id, it]))
  const keys = (items ?? []).map((it) => it.cleaned_image_key).filter((k): k is string => Boolean(k))
  const urls = await getSignedUrls(keys)

  const looks: ShareLook[] = (outfits ?? []).map((o) => ({
    outfitId: o.id,
    items: o.item_ids
      .map((id) => itemsById.get(id))
      .filter(Boolean)
      .map((it) => ({
        id: it!.id,
        category: it!.category,
        subcategory: it!.subcategory,
        colors: it!.colors,
        imageUrl: it!.cleaned_image_key ? urls[it!.cleaned_image_key] ?? null : null,
      })),
  }))

  const challenges = await getChallenges(supabase)
  return { looks, challenges }
}
