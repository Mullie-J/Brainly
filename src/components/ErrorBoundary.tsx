import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('Brainly ErrorBoundary caught:', error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-surface border border-red-500/30 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3 text-red-500">
            <AlertTriangle size={18} />
            <h2 className="font-semibold">Er ging iets mis</h2>
          </div>
          <pre className="text-xs text-muted whitespace-pre-wrap bg-surface2/40 p-3 rounded mb-4 max-h-[300px] overflow-auto">
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <div className="flex gap-2">
            <button
              onClick={this.reset}
              className="text-sm px-3 py-1.5 rounded-md bg-accent text-white hover:opacity-90"
            >
              Opnieuw proberen
            </button>
            <button
              onClick={() => (window.location.href = '/')}
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
