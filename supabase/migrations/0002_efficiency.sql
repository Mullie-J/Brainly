-- Brainly migration 0002: efficiency features
-- - time-blocking (start_time on todos)
-- - daily plans (Top 3 + shutdown reflection)
-- - distill + spaced review on notes
-- Run this in the Supabase SQL editor after 0001_init.sql.

-- ============================================================
-- TODOS: time-blocking
-- ============================================================
alter table todos add column if not exists start_time time;
alter table todos add column if not exists duration_min int;

-- ============================================================
-- DAILY PLANS: top 3 + shutdown reflection (one row per user per day)
-- ============================================================
create table if not exists daily_plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  date            date not null,
  top3_todo_ids   jsonb not null default '[]'::jsonb,
  shutdown_note   text,
  next_day_top3   jsonb not null default '[]'::jsonb,   -- captured during shutdown for next day
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists daily_plans_user_date_idx on daily_plans (user_id, date desc);

alter table daily_plans enable row level security;

drop policy if exists "daily_plans_own" on daily_plans;
create policy "daily_plans_own" on daily_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists daily_plans_updated_at on daily_plans;
create trigger daily_plans_updated_at before update on daily_plans
  for each row execute function set_updated_at();

-- ============================================================
-- NOTES: distill (TL;DR) + spaced review state
-- ============================================================
alter table notes add column if not exists tldr text;
alter table notes add column if not exists last_reviewed_at timestamptz;
alter table notes add column if not exists review_interval_days int not null default 1;
alter table notes add column if not exists review_enabled boolean not null default true;

create index if not exists notes_review_idx on notes (user_id, last_reviewed_at);
