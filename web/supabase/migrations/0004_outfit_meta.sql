-- 0004: persist the editorial title + confidence on a look.
--
-- Why: "today's look" is now generated ONCE per calendar day and re-read on every
-- subsequent page load (see api/recommend `mode: 'daily'`). Title and confidence
-- were previously returned to the client but never stored, so a reload lost the
-- "Monsoon Office Chic." headline and the match %.
--
-- Safe to run more than once. The app degrades gracefully if this is NOT applied:
-- api/recommend retries the insert without these columns.

alter table public.outfits add column if not exists title text;
alter table public.outfits add column if not exists confidence real;

-- `source` already exists and defaults to 'ai'. Rows written by the once-a-day
-- auto-pick are tagged source='daily' so that merely opening the app does not
-- build a styling streak (the streak counts days you actively hit "Style me").
comment on column public.outfits.source is
  'ai = user-initiated generation ("Style me"); daily = the once-per-day auto pick shown on the Style home (excluded from streak).';
