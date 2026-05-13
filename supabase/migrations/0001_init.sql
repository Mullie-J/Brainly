-- Brainly initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'active',
  deadline    date,
  north_star  text,
  links       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists todos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  project_id   uuid references projects on delete set null,
  title        text not null,
  status       text not null default 'todo',
  priority     smallint not null default 2,
  due_date     date,
  position     double precision not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  project_id  uuid references projects on delete set null,
  todo_id     uuid references todos on delete set null,
  title       text not null default 'Untitled',
  content     jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projects_user_idx on projects (user_id, updated_at desc);
create index if not exists todos_user_idx    on todos    (user_id, status, position);
create index if not exists todos_project_idx on todos    (project_id);
create index if not exists notes_user_idx    on notes    (user_id, updated_at desc);
create index if not exists notes_project_idx on notes    (project_id);
create index if not exists notes_todo_idx    on notes    (todo_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table projects enable row level security;
alter table todos    enable row level security;
alter table notes    enable row level security;

-- Drop-then-create so the migration is idempotent.
drop policy if exists "projects_own" on projects;
create policy "projects_own" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "todos_own" on todos;
create policy "todos_own" on todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes_own" on notes;
create policy "notes_own" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- updated_at trigger
-- ============================================================

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at before update on projects
  for each row execute function set_updated_at();

drop trigger if exists todos_updated_at on todos;
create trigger todos_updated_at before update on todos
  for each row execute function set_updated_at();

drop trigger if exists notes_updated_at on notes;
create trigger notes_updated_at before update on notes
  for each row execute function set_updated_at();
