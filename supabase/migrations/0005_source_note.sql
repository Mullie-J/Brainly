-- Brainly migration 0005: koppel to-do's aan de notitie waaruit ze ontstaan
-- - source_note_id: many-to-one (één note kan meerdere to-do's voortbrengen)

alter table todos
  add column if not exists source_note_id uuid references notes on delete set null;

create index if not exists todos_source_note_idx on todos (source_note_id);
