import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

const CHUNK_RELOAD_KEY = 'brainly:chunk-reload-attempt';

function isChunkLoadError(err: Error): boolean {
  const msg = err.message ?? '';
  const name = err.name ?? '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('ChunkLoadError') ||
    name === 'ChunkLoadError'
  );
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    if (isChunkLoadError(error)) {
      // Stale index.html in cache referencing an old chunk hash that no
      // longer exists on the server (typical after a fresh Vercel deploy).
      // Force a hard reload once — sessionStorage flag prevents reload loops.
      const alreadyAttempted = sessionStorage.getItem(CHUNK_RELOAD_KEY);
      if (!alreadyAttempted) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        window.location.reload();
        return;
      }
    }
    console.error('Brainly ErrorBoundary caught:', error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  hardReload = () => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const chunk = isChunkLoadError(this.state.error);
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-surface border border-red-500/30 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3 text-red-500">
            <AlertTriangle size={18} />
            <h2 className="font-semibold">Er ging iets mis</h2>
          </div>
          {chunk ? (
            <p className="text-sm text-muted mb-4">
              De app is geüpdatet sinds je deze tab opende. Klik "Herlaad" om
              de nieuwste versie op te halen.
            </p>
          ) : (
            <pre className="text-xs text-muted whitespace-pre-wrap bg-surface2/40 p-3 rounded mb-4 max-h-[300px] overflow-auto">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          )}
          <div className="flex gap-2">
            <button
              onClick={chunk ? this.hardReload : this.reset}
              className="text-sm px-3 py-1.5 rounded-md bg-accent text-white hover:opacity-90"
            >
              {chunk ? 'Herlaad' : 'Opnieuw proberen'}
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem(CHUNK_RELOAD_KEY);
                window.location.href = '/';
              }}
              className="text-sm px-3 py-1.5 rounded-md border border-border text-muted hover:text-text"
            >
              Naar Vandaag
            </button>
          </div>
        </div>
      </div>
    );
  }
}
