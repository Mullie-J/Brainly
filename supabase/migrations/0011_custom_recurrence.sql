-- Custom recurrence: list of explicit ISO dates the todo should repeat on.
-- Used when recurrence_type = 'custom'. Empty/null otherwise.

alter table todos
  add column if not exists recurrence_dates jsonb;

-- recurrence_type now accepts 'custom' in addition to 'daily' | 'weekdays' |
-- 'weekly' | 'monthly'. (Column is plain text, no enum, so no schema change
-- needed — the type union in src/lib/types.ts is the source of truth.)
