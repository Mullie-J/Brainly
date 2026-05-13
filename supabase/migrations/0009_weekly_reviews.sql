-- Weekly review: guided prompts persisted per week.

create table if not exists weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,        -- monday of the reviewed week
  went_well text,
  time_wasters text,
  carry_over text,                 -- what slides to next week
  next_week_top3 jsonb default '{}'::jsonb,  -- { "mon": ["..","..",".."], "tue": [...] }
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table weekly_reviews enable row level security;

create policy "users own weekly_reviews"
  on weekly_reviews for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger weekly_reviews_updated_at before update on weekly_reviews
  for each row execute function set_updated_at();
