-- Brainly migration 0006: open vs. afgeronde notities
-- - is_done: boolean. Open notities verschijnen in de sidebar; klaar-gezette
--   verdwijnen uit de quick-access lijst maar blijven vindbaar via Alle notities.

alter table notes add column if not exists is_done boolean not null default false;

create index if not exists notes_open_idx on notes (user_id, is_done, updated_at desc);
