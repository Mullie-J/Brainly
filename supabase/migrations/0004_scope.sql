-- Brainly migration 0004: werk/privé scoping voor to-do's
-- - scope: 'work' (default) | 'personal'

alter table todos add column if not exists scope text not null default 'work';

create index if not exists todos_user_scope_idx on todos (user_id, scope);
