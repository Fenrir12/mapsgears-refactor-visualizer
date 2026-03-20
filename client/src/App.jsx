import { useState } from 'react';
import { useAuth } from './hooks/useApi';
import Dashboard from './components/Dashboard';

function LoginScreen() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        setError('Wrong password');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[60%] h-[60%] rounded-full bg-accent/[0.03] blur-[120px]" />
        <div className="absolute -bottom-[30%] -right-[20%] w-[50%] h-[50%] rounded-full bg-kotlin/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 animate-fade-in-up text-center">
        <div className="mb-8">
          <div className="font-mono text-[10px] tracking-[0.3em] text-accent/60 uppercase mb-3">
            Migration Tracker
          </div>
          <h1 className="font-mono text-3xl font-light text-text-white tracking-tight mb-2">
            Refactor Visualizer
          </h1>
          <div className="h-[1px] w-24 mx-auto bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        </div>

        <form onSubmit={handleSubmit} className="relative overflow-hidden rounded-lg border border-border bg-card backdrop-blur-sm px-10 py-8">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

          <div className="font-mono text-xs text-text-dim mb-6">
            Enter password to continue
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full bg-surface border border-border rounded px-4 py-2.5 font-mono text-sm text-text-bright
              focus:outline-none focus:border-accent/40 transition-colors mb-4
              placeholder:text-text-muted [color-scheme:dark]"
          />

          {error && (
            <div className="font-mono text-[11px] text-negative mb-3">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full font-mono text-[11px] tracking-wider uppercase
              px-6 py-2.5 rounded border border-accent/30 text-accent
              hover:border-accent/60 hover:bg-accent/10
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-200 cursor-pointer"
          >
            {loading ? 'Verifying...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="font-mono text-xs text-text-muted animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginScreen />;

  return <Dashboard />;
}

export default App;
