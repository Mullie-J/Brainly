-- Brainly migration 0003: richer to-do fields
-- - description: vrije tekst, lichte context per to-do
-- - effort_min: geschatte tijd in minuten (planning fallacy → time blocking auto-fill)
-- - recurrence_type: simpele enum voor herhalingen

alter table todos add column if not exists description text;
alter table todos add column if not exists effort_min int;
alter table todos add column if not exists recurrence_type text;
-- recurrence_type values: null (no recurrence), 'daily', 'weekdays', 'weekly', 'monthly'
