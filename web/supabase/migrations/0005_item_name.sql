-- 0005: user-editable name for a wardrobe item.
--
-- Why a new column rather than reusing `subcategory`: bucketFor() (components/Glyph.tsx)
-- regex-matches over subcategory to decide the closet chip an item lives under, so
-- naming a shirt "My favourite" would silently re-bucket it to Other and change its
-- fallback silhouette. `name` is display-only; `subcategory` stays machine-owned.
--
-- Display everywhere is `name || subcategory || category`, so existing rows (name null)
-- render exactly as before. Safe to run more than once.

alter table public.items add column if not exists name text;

comment on column public.items.name is
  'User-typed display name. Falls back to subcategory || category when null. Never used for bucketing/tagging — that stays on category/subcategory.';
