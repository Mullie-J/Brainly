# Brainly

Persoonlijke second-brain projectmanagement-tool. Projecten, to-do's en notities — gekoppeld waar dat helpt.

**Stack:** React + Vite + TypeScript · Tailwind · Supabase (auth + Postgres) · BlockNote (Notion-style editor) · @dnd-kit (Kanban) · TanStack Query.

## Setup

### 1. Maak een Supabase project

Ga naar [supabase.com/dashboard](https://supabase.com/dashboard/projects) → "New project". Onthoud het database-wachtwoord.

### 2. Run de migratie

Open in je Supabase-project **SQL Editor → New query**, plak de inhoud van [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), klik **Run**.

Dit maakt de tabellen (`projects`, `todos`, `notes`) inclusief row-level security en `updated_at` triggers.

### 3. Kopieer je keys

In Supabase: **Project Settings → API**. Kopieer:
- Project URL
- `anon` `public` key

Maak in de root van dit project een bestand `.env.local`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### 4. Run

```bash
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173/). Login met je e-mail (magic link). Vite leest `.env` alleen bij opstart — herstart na wijziging.

## Sneltoetsen

| | |
|---|---|
| `⌘K` / `Ctrl+K` | Command palette — zoek + acties |
| `N` | Nieuwe to-do (quick-add overal) |

## Concepten

- **Project** — verzamelt to-do's en notities. Heeft titel, status (actief/on-hold/klaar/archief), deadline, north-star outcome, beschrijving en links.
- **To-do** — hangt aan een project of in de **Inbox** (geen project). Drie statussen (Te doen / Bezig / Klaar) gepresenteerd als Kanban. Drie prio-levels (P1/P2/P3). Optionele due date.
- **Notitie** — block-based editor (Notion-stijl, met `/` voor commands). Kan los staan, hangen aan een project, of aan een specifieke to-do.
- **Vandaag** — overzicht van wat in uitvoering is en wat verloopt vandaag.

## Deploy

Vercel met de twee `VITE_SUPABASE_*` env vars onder Project Settings → Environment Variables.

```bash
npm run build
```

## Data model

Drie tabellen, één gebruiker per rij via `user_id` + RLS-policy. Notes hebben `project_id` en `todo_id` nullable — beide kunnen tegelijk gezet zijn.
