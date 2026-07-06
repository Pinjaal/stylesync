-- ============================================================
-- StyleSync · Community (posts, likes, comments, follows, challenges)
-- Run this in Supabase → SQL Editor before using the Community tab.
-- ============================================================

-- Themed weekly challenges (e.g. #DenimWeek). Seeded below.
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique,          -- without the leading '#'
  title text not null,
  description text,
  grad text default '#4A6480,#2C3E50', -- two hex stops for the hero gradient
  ends_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_key text,                    -- uploaded OOTD photo (in wardrobe bucket)
  outfit_id uuid references public.outfits(id) on delete set null, -- a logged look
  caption text,
  location text,
  challenge_id uuid references public.challenges(id) on delete set null,
  tag_closet boolean default false,
  created_at timestamptz default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_user_idx on public.posts (user_id, created_at desc);
create index if not exists posts_challenge_idx on public.posts (challenge_id);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
create index if not exists post_likes_post_idx on public.post_likes (post_id);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);

-- Let the feed read author display info across users WITHOUT exposing sensitive
-- columns (gender, date_of_birth). A view owned by the definer bypasses the
-- profiles "read own" RLS but only surfaces safe fields.
create or replace view public.community_profiles as
  select id, display_name, city, style_preferences
  from public.profiles;
grant select on public.community_profiles to authenticated, anon;

-- Row Level Security
alter table public.challenges enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.follows enable row level security;

create policy "Anyone reads challenges" on public.challenges for select using (true);

create policy "Anyone reads posts" on public.posts for select using (true);
create policy "Users write own posts" on public.posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Anyone reads likes" on public.post_likes for select using (true);
create policy "Users like as themselves" on public.post_likes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Anyone reads comments" on public.post_comments for select using (true);
create policy "Users comment as themselves" on public.post_comments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Anyone reads follows" on public.follows for select using (true);
create policy "Users follow as themselves" on public.follows
  for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

-- Seed a few challenges (idempotent). Adjust ends_at as you like.
insert into public.challenges (tag, title, description, grad, ends_at) values
  ('DenimWeek', 'Denim Week', 'Style denim seven ways. Jackets, dresses, double-denim — show us your best.', '#4A6480,#2C3E50', now() + interval '3 days'),
  ('WorkwearWin', 'Workwear Win', 'Office-ready fits that still feel like you.', '#7A5638,#3A2A20', now() + interval '10 days'),
  ('ThriftFlip', 'Thrift Flip', 'One thrifted piece, styled like new.', '#4C5A41,#26301F', now() + interval '17 days')
on conflict (tag) do nothing;
