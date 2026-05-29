import { createClient } from '@supabase/supabase-js'

const BUCKET = 'wardrobe'

// Service-role client — bypasses RLS. Server-only, never expose to the browser.
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function downloadFromStorage(path: string): Promise<Buffer> {
  const supabase = getAdminClient()
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error) throw new Error(`Storage download failed: ${error.message}`)
  if (!data) throw new Error(`Storage download returned no data for ${path}`)
  const arr = await data.arrayBuffer()
  return Buffer.from(arr)
}

export async function uploadToStorage(
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const supabase = getAdminClient()
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,        // overwrite if it exists — fine for processed images
  })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
}

export async function getSignedUrl(
  path: string,
  expiresIn = 3600,     // 1 hour
): Promise<string> {
  const supabase = getAdminClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn)
  if (error) throw new Error(`Signed URL failed: ${error.message}`)
  if (!data?.signedUrl) throw new Error(`No signed URL returned for ${path}`)
  return data.signedUrl
}

export async function deleteFromStorage(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const supabase = getAdminClient()
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) throw new Error(`Storage delete failed: ${error.message}`)
}

export async function getSignedUrls(
  paths: string[],
  expiresIn = 3600,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const supabase = getAdminClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, expiresIn)
  if (error) throw new Error(`Signed URLs failed: ${error.message}`)

  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) map[row.path] = row.signedUrl
  }
  return map
}