-- Habit tracker: binary daily tickers (separate from todos).

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  emoji text,
  color text default 'amber',  -- amber | emerald | sky | violet | rose
  position int default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

alter table habits enable row level security;
alter table habit_logs enable row level security;

create policy "users own habits"
  on habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users own habit_logs"
  on habit_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists habit_logs_user_date_idx on habit_logs(user_id, date);
create index if not exists habits_user_id_idx on habits(user_id) where archived_at is null;

-- updated_at trigger reuses existing function from 0001_init.sql
create trigger habits_updated_at before update on habits
  for each row execute function set_updated_at();
