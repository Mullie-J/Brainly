import { useState } from 'react';
import { Brain, Mail, ArrowRight, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const { signInWithMagicLink, signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('sending');
    setError(null);
    const { error } = await signInWithMagicLink(email);
    if (error) {
      setError(error.message);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setStatus('sending');
    setError(null);
    const { error } = await signInWithPassword(email, password);
    if (error) {
      setError(error.message);
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
            <Brain size={20} className="text-accent" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Brainly</span>
        </div>

        <h1 className="text-2xl font-semibold mb-2 tracking-tight">Welkom terug</h1>
        <p className="text-muted mb-8 text-sm">
          Voer je e-mail in. We sturen je een magic link.
        </p>

        {status === 'sent' ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm">
            <p className="font-medium mb-1">Check je inbox</p>
            <p className="text-muted">
              We hebben een link gestuurd naar <span className="text-text">{email}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              />
              <input
                type="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@voorbeeld.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface border border-border text-sm focus:border-accent transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {status === 'sending' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Stuur magic link <ArrowRight size={16} />
                </>
              )}
            </button>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </form>
        )}

        {import.meta.env.DEV && status !== 'sent' && (
          <div className="mt-6 pt-6 border-t border-border">
            {!showPassword ? (
              <button
                onClick={() => setShowPassword(true)}
                className="text-xs text-muted hover:text-text transition-colors flex items-center gap-1.5"
              >
                <Lock size={12} />
                Dev: inloggen met wachtwoord
              </button>
            ) : (
              <form onSubmit={submitPassword} className="space-y-3">
                <p className="text-xs text-muted mb-2">Dev-only password login</p>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="naam@voorbeeld.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface border border-border text-sm focus:border-accent transition-colors"
                  />
                </div>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                  />
                  <input
                    type="password"
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Wachtwoord"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface border border-border text-sm focus:border-accent transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full py-2.5 rounded-lg bg-surface border border-border text-sm font-medium hover:bg-border/50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {status === 'sending' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Inloggen'
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
