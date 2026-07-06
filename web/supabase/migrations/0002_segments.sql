-- ============================================================
-- StyleSync · Segments (custom closet collections)
-- Run this in Supabase → SQL Editor before using the Segments feature.
-- ============================================================

create table if not exists public.segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text default '#EE4127',
  created_at timestamptz default now()
);
create index if not exists segments_user_idx on public.segments (user_id, created_at desc);

create table if not exists public.segment_items (
  segment_id uuid not null references public.segments(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (segment_id, item_id)
);
create index if not exists segment_items_item_idx on public.segment_items (item_id);

-- Row Level Security
alter table public.segments enable row level security;
alter table public.segment_items enable row level security;

create policy "Users full access to own segments" on public.segments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Membership rows are reachable only through a segment the user owns.
create policy "Users manage own segment items" on public.segment_items
  for all
  using (
    exists (
      select 1 from public.segments s
      where s.id = segment_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.segments s
      where s.id = segment_id and s.user_id = auth.uid()
    )
  );
