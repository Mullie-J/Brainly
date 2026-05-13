import { Brain, ExternalLink } from 'lucide-react';

export default function Setup() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
            <Brain size={20} className="text-accent" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Brainly</span>
        </div>

        <h1 className="text-2xl font-semibold mb-2 tracking-tight">Supabase setup</h1>
        <p className="text-muted mb-6 text-sm">
          Voor de eerste keer moet je een gratis Supabase-project koppelen. Dit is je
          eigen database — alleen jij hebt toegang.
        </p>

        <ol className="space-y-4 text-sm">
          <li className="rounded-lg border border-border bg-surface p-4">
            <div className="font-medium mb-1">1. Maak een Supabase project</div>
            <p className="text-muted">
              Ga naar{' '}
              <a
                href="https://supabase.com/dashboard/projects"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline inline-flex items-center gap-1"
              >
                supabase.com/dashboard <ExternalLink size={12} />
              </a>{' '}
              en maak een nieuw project. Onthoud je database-wachtwoord.
            </p>
          </li>

          <li className="rounded-lg border border-border bg-surface p-4">
            <div className="font-medium mb-1">2. Run de migratie</div>
            <p className="text-muted mb-2">
              In je Supabase-project: open SQL Editor → New query → plak de inhoud van{' '}
              <code className="px-1 py-0.5 rounded bg-surface2 text-xs">
                supabase/migrations/0001_init.sql
              </code>{' '}
              → Run.
            </p>
          </li>

          <li className="rounded-lg border border-border bg-surface p-4">
            <div className="font-medium mb-1">3. Kopieer keys naar .env.local</div>
            <p className="text-muted mb-2">
              Project Settings → API → kopieer Project URL + anon public key. Maak
              vervolgens in de root van het project een file{' '}
              <code className="px-1 py-0.5 rounded bg-surface2 text-xs">.env.local</code>:
            </p>
            <pre className="text-xs bg-surface2 rounded p-3 overflow-x-auto">
{`VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...`}
            </pre>
          </li>

          <li className="rounded-lg border border-border bg-surface p-4">
            <div className="font-medium mb-1">4. Herstart de dev server</div>
            <p className="text-muted">
              Stop <code className="px-1 py-0.5 rounded bg-surface2 text-xs">npm run dev</code>{' '}
              (Ctrl+C) en start opnieuw. Vite leest .env alleen bij opstart.
            </p>
          </li>
        </ol>
      </div>
    </div>
  );
}
