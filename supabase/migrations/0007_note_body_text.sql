-- Brainly migration 0007: plain-text representatie van notes voor zoeken
-- - body_text: extracte plain text uit BlockNote content (door app gevuld)
-- - GIN index voor snelle ILIKE search op grotere datasets

alter table notes add column if not exists body_text text;

create index if not exists notes_body_text_trgm_idx
  on notes using gin (body_text gin_trgm_ops);

create extension if not exists pg_trgm;
