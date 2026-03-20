import { useState, useCallback } from 'react';
import { useSnapshots, useLatestSnapshot, useConfig, triggerSync } from '../hooks/useApi';
import SummaryCards from './SummaryCards';
import BreakdownChart from './BreakdownChart';
import Charts from './Charts';
import ClassChanges from './ClassChanges';

function StatusDot({ syncing }) {
  return (
    <span className="relative flex h-2 w-2">
      {syncing && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${syncing ? 'bg-accent' : 'bg-positive'}`} />
    </span>
  );
}

export default function Dashboard() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [syncing, setSyncing] = useState(false);

  const { data: snapshots, loading: snapshotsLoading, refetch } = useSnapshots(startDate, endDate);
  const { data: latest, loading: latestLoading } = useLatestSnapshot();
  const { data: config } = useConfig();

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await triggerSync();
      // Wait a beat then refetch
      setTimeout(() => {
        refetch();
        setSyncing(false);
      }, 2000);
    } catch {
      setSyncing(false);
    }
  }, [refetch]);

  const isLoading = snapshotsLoading || latestLoading;

  return (
    <div className="min-h-screen bg-void">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[60%] h-[60%] rounded-full bg-accent/[0.02] blur-[120px]" />
        <div className="absolute -bottom-[30%] -right-[20%] w-[50%] h-[50%] rounded-full bg-kotlin/[0.02] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="animate-fade-in-up mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-accent/60 uppercase mb-2">
                Migration Tracker
              </div>
              <h1 className="font-mono text-2xl sm:text-3xl font-light text-text-white tracking-tight">
                Refactor Visualizer
              </h1>
              {config?.targetFolder && (
                <div className="font-mono text-xs text-text-muted mt-2 flex items-center gap-2">
                  <svg className="w-3 h-3 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="text-text-dim">{config.repoCallsign}</span>
                  <span className="text-border-light">/</span>
                  <span>{config.targetFolder}</span>
                </div>
              )}
            </div>

            {/* Sync controls + user */}
            <div className="flex items-center gap-4">
              {latest?.synced_at && (
                <div className="flex items-center gap-2">
                  <StatusDot syncing={syncing} />
                  <span className="font-mono text-[10px] text-text-muted">
                    Last sync {new Date(latest.synced_at).toLocaleString()}
                  </span>
                </div>
              )}
              <button
                onClick={handleSync}
                disabled={syncing}
                className="font-mono text-[11px] tracking-wider uppercase px-4 py-2 rounded border border-border-light
                  text-text-dim hover:text-text-bright hover:border-accent/40 hover:bg-accent/5
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-200 cursor-pointer"
              >
                {syncing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Syncing...
                  </span>
                ) : 'Sync Now'}
              </button>
              <button
                onClick={() => fetch('/auth/logout', { method: 'POST' }).then(() => window.location.reload())}
                className="pl-2 border-l border-border font-mono text-[9px] text-text-muted hover:text-negative tracking-wider uppercase transition-colors cursor-pointer"
                title="Logout"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Separator */}
          <div className="mt-6 h-[1px] bg-gradient-to-r from-border via-border-light to-border" />
        </header>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-lg loading-shimmer" />
              ))}
            </div>
            <div className="h-48 rounded-lg loading-shimmer" />
            <div className="h-72 rounded-lg loading-shimmer" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary cards */}
            <SummaryCards snapshots={snapshots} latest={latest} />

            {/* Breakdown + Date filter row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <BreakdownChart latest={latest} />
              </div>

              {/* Date range filter */}
              <div className="animate-fade-in-up stagger-4 relative overflow-hidden rounded-lg border border-border bg-card backdrop-blur-sm p-5">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                <div className="font-mono text-[10px] tracking-[0.2em] text-text-muted mb-4 uppercase">
                  Date Range Filter
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="font-mono text-[10px] text-text-dim block mb-1 uppercase tracking-wider">From</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-surface border border-border rounded px-3 py-2 font-mono text-xs text-text-bright
                        focus:outline-none focus:border-accent/40 transition-colors
                        [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-text-dim block mb-1 uppercase tracking-wider">To</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-surface border border-border rounded px-3 py-2 font-mono text-xs text-text-bright
                        focus:outline-none focus:border-accent/40 transition-colors
                        [color-scheme:dark]"
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                      className="font-mono text-[10px] text-accent/60 hover:text-accent tracking-wider uppercase transition-colors cursor-pointer"
                    >
                      Clear filter
                    </button>
                  )}
                </div>

                {/* Snapshot count */}
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">Snapshots</span>
                    <span className="font-mono text-lg font-light text-text-white">{snapshots.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Class changes summary */}
            <ClassChanges />

            {/* Time series charts */}
            {snapshots.length > 1 ? (
              <Charts snapshots={snapshots} />
            ) : (
              <div className="animate-fade-in-up stagger-5 rounded-lg border border-border bg-card backdrop-blur-sm p-12 text-center">
                <div className="font-mono text-text-dim text-sm">
                  {snapshots.length === 0
                    ? 'No data yet. Run a sync to start tracking metrics.'
                    : 'Need at least 2 snapshots to render time-series charts. Run another sync after a new commit.'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 py-6 border-t border-border">
          <div className="font-mono text-[10px] text-text-muted text-center tracking-wider">
            REFACTOR VISUALIZER &middot; PHABRICATOR VCS METRICS
          </div>
        </footer>
      </div>
    </div>
  );
}
