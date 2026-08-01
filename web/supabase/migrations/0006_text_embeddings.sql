-- 0006: switch search from CLIP image vectors to Gemini TEXT embeddings.
--
-- Why: we used to embed the garment IMAGE with CLIP (512-dim) and compare text
-- queries against image vectors — a cross-modal mismatch that made retrieval
-- weak. We now embed the tagger's TEXT description with Gemini gemini-embedding-001
-- (768-dim), so search is text-vs-text. The item vectors (api/items/process) and
-- the query vector (api/recommend) both use that same model + dimension.
--
-- This changes the `embedding` column dimension 512 -> 768, so:
--   1. existing 512-dim vectors are cleared (re-populated by scripts/backfill-embeddings.mjs),
--   2. any index on the column is dropped and rebuilt for the new dimension,
--   3. match_items() is recreated for vector(768) with a simpler signature.
--
-- ORDER OF OPERATIONS: apply this migration BEFORE deploying the new code (the
-- write path is resilient — it retries without a vector if the column is still
-- 512 — but retrieval only improves once this is in and the backfill has run).

-- 1. Drop any index that references items.embedding (can't retype the column
--    while an index depends on it). Covers whatever the index is named.
do $$
declare r record;
begin
  for r in
    select i.indexrelid::regclass as idx
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
    where i.indrelid = 'public.items'::regclass and a.attname = 'embedding'
  loop
    execute 'drop index if exists ' || r.idx;
  end loop;
end $$;

-- 2. Clear the old 512-dim vectors and retype the column to 768. USING null
--    blanks the existing values so the type change can't fail on a dim mismatch.
alter table public.items
  alter column embedding type extensions.vector(768) using null::extensions.vector(768);

-- 3. Rebuild an approximate-NN index for cosine distance at the new dimension.
--    HNSW handles incremental inserts well and needs no list tuning.
create index if not exists items_embedding_hnsw
  on public.items using hnsw (embedding extensions.vector_cosine_ops);

-- 4. Recreate match_items for the new signature. The previous version took
--    occasion/season params and applied a similarity cut-off; the caller now
--    handles occasion via tag top-up and wants a plain ranked list, so this
--    ranks the whole active closet by cosine similarity and returns the top N.
drop function if exists public.match_items(uuid, extensions.vector, text, text, integer);
drop function if exists public.match_items(uuid, extensions.vector, integer);

create function public.match_items(
  p_user_id uuid,
  p_query_embedding extensions.vector(768),
  p_limit integer
)
returns table (
  id uuid,
  category text,
  subcategory text,
  colors text[],
  description text,
  cleaned_image_key text,
  similarity double precision
)
language sql
stable
as $$
  select
    i.id,
    i.category,
    i.subcategory,
    i.colors,
    i.description,
    i.cleaned_image_key,
    1 - (i.embedding <=> p_query_embedding) as similarity
  from public.items i
  where i.user_id = p_user_id
    and i.is_active = true
    and i.embedding is not null
  order by i.embedding <=> p_query_embedding
  limit p_limit;
$$;
