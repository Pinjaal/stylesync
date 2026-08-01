// One-off backfill: re-embed every existing item's TEXT description with Gemini
// gemini-embedding-001 (768-dim) and write it to items.embedding.
//
// Run AFTER applying migration 0006 (which retypes the column to 768 and clears
// the old 512-dim vectors). Idempotent — safe to re-run; it just recomputes.
//
//   cd web && node --env-file=.env.local scripts/backfill-embeddings.mjs
//
// Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY.

import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI = process.env.GEMINI_API_KEY
const MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001'
const DIMS = Number(process.env.GEMINI_EMBED_DIMS) || 768

if (!URL || !KEY || !GEMINI) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY')
  process.exit(1)
}

// MUST match itemEmbedText() in web/src/lib/gemini.ts, or backfilled vectors
// won't match ones written by the live upload path.
function itemEmbedText(a) {
  return [
    a.description,
    a.category,
    a.subcategory,
    (a.colors ?? []).join(' '),
    a.pattern,
    a.fabric,
    a.fit,
    (a.occasions ?? []).join(' '),
    (a.seasons ?? []).join(' '),
  ]
    .filter((s) => s && String(s).trim())
    .join('. ')
}

async function embed(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${GEMINI}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${MODEL}`,
        content: { parts: [{ text }] },
        outputDimensionality: DIMS,
      }),
    },
  )
  if (!res.ok) throw new Error(`embed ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const j = await res.json()
  const values = j.embedding?.values
  if (!Array.isArray(values) || !values.length) throw new Error('no vector returned')
  return values
}

const db = createClient(URL, KEY, { auth: { persistSession: false } })

const { data: items, error } = await db
  .from('items')
  .select('id, description, category, subcategory, colors, pattern, fabric, fit, occasions, seasons')
if (error) {
  console.error('fetch items failed:', error.message)
  process.exit(1)
}

console.log(`Backfilling ${items.length} item(s) with ${MODEL}…`)
let ok = 0
let failed = 0
for (const it of items) {
  const text = itemEmbedText(it)
  if (!text) {
    console.warn(`- ${it.id}: no text to embed, skipping`)
    continue
  }
  try {
    const vector = await embed(text)
    const { error: upErr } = await db.from('items').update({ embedding: vector }).eq('id', it.id)
    if (upErr) throw new Error(upErr.message)
    ok++
    console.log(`✓ ${it.id} (${vector.length}d)`)
  } catch (e) {
    failed++
    console.error(`✗ ${it.id}: ${e.message}`)
  }
}
console.log(`Done. ${ok} embedded, ${failed} failed.`)
