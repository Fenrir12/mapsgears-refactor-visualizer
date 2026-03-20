import { useState, useMemo } from 'react';
import { useClassChanges } from '../hooks/useApi';

function ChangeEntry({ cls, type }) {
  const isAdded = type === 'added';
  const icon = isAdded ? '+' : '\u2212';
  const colorClass = isAdded ? 'text-positive' : 'text-negative';
  const bgClass = isAdded ? 'bg-positive/5 hover:bg-positive/10' : 'bg-negative/5 hover:bg-negative/10';
  const borderClass = isAdded ? 'border-positive/10' : 'border-negative/10';
  const langColor = cls.language === 'java' ? 'text-java' : 'text-kotlin';
  const langBg = cls.language === 'java' ? 'bg-java/10' : 'bg-kotlin/10';

  // Shorten file path for display
  const shortPath = cls.file?.split('/').slice(-2).join('/') || '';

  return (
    <div className={`group flex items-center gap-3 px-3 py-2 rounded border ${borderClass} ${bgClass} transition-all duration-200`}>
      {/* +/- indicator */}
      <span className={`font-mono text-sm font-bold ${colorClass} w-4 shrink-0 text-center`}>
        {icon}
      </span>

      {/* Language tag */}
      <span className={`font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded ${langBg} ${langColor} shrink-0`}>
        {cls.language === 'java' ? 'JV' : 'KT'}
      </span>

      {/* Class name */}
      <span className="font-mono text-xs text-text-bright truncate">
        {cls.name}
      </span>

      {/* File path */}
      <span className="ml-auto font-mono text-[10px] text-text-muted truncate max-w-[200px] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {shortPath}
      </span>
    </div>
  );
}

function ChangeBadge({ count, type }) {
  const isAdded = type === 'added';
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${isAdded ? 'bg-positive/10' : 'bg-negative/10'}`}>
      <span className={`font-mono text-[10px] font-bold ${isAdded ? 'text-positive' : 'text-negative'}`}>
        {isAdded ? '+' : '\u2212'}{count}
      </span>
      <span className="font-mono text-[9px] text-text-muted uppercase tracking-wider">
        {type}
      </span>
    </div>
  );
}

function ChangeGroup({ change, index }) {
  const [expanded, setExpanded] = useState(index === 0);
  const dateStr = new Date(change.to_date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: `${index * 0.04}s` }}>
      {/* Commit range header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full cursor-pointer group"
      >
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:border-border-light bg-surface/50 hover:bg-surface transition-all duration-200">
          {/* Expand arrow */}
          <svg
            className={`w-3 h-3 text-text-muted transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>

          {/* Commit hashes */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-text-dim">{change.from_commit}</span>
            <svg className="w-3 h-3 text-accent/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="font-mono text-[10px] text-text-bright">{change.to_commit}</span>
          </div>

          {/* Date */}
          <span className="font-mono text-[10px] text-text-muted">{dateStr}</span>

          {/* Badges */}
          <div className="ml-auto flex items-center gap-2">
            {change.added.length > 0 && <ChangeBadge count={change.added.length} type="added" />}
            {change.removed.length > 0 && <ChangeBadge count={change.removed.length} type="removed" />}

            {/* Net badge */}
            <div className={`px-2 py-1 rounded font-mono text-[10px] font-bold
              ${change.net > 0 ? 'bg-positive/5 text-positive' : change.net < 0 ? 'bg-negative/5 text-negative' : 'bg-border text-text-muted'}`}>
              net {change.net > 0 ? '+' : ''}{change.net}
            </div>
          </div>
        </div>
      </button>

      {/* Expanded class list */}
      {expanded && (
        <div className="mt-1 ml-6 space-y-1 pb-2">
          {change.added.map((cls, i) => (
            <ChangeEntry key={`a-${i}`} cls={cls} type="added" />
          ))}
          {change.removed.map((cls, i) => (
            <ChangeEntry key={`r-${i}`} cls={cls} type="removed" />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClassChanges() {
  const { data, loading } = useClassChanges();
  const [filter, setFilter] = useState('all'); // 'all' | 'added' | 'removed'

  const filteredChanges = useMemo(() => {
    if (!data?.changes) return [];
    if (filter === 'all') return data.changes;
    return data.changes
      .map(c => ({
        ...c,
        added: filter === 'added' ? c.added : [],
        removed: filter === 'removed' ? c.removed : [],
      }))
      .filter(c => c.added.length > 0 || c.removed.length > 0);
  }, [data, filter]);

  // Aggregate totals
  const totals = useMemo(() => {
    if (!data?.changes) return { added: 0, removed: 0, net: 0 };
    return data.changes.reduce((acc, c) => ({
      added: acc.added + c.added.length,
      removed: acc.removed + c.removed.length,
      net: acc.net + c.net,
    }), { added: 0, removed: 0, net: 0 });
  }, [data]);

  if (loading) {
    return (
      <div className="animate-fade-in-up stagger-6 rounded-lg border border-border bg-card backdrop-blur-sm p-5">
        <div className="h-6 w-48 loading-shimmer rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-10 loading-shimmer rounded" />)}
        </div>
      </div>
    );
  }

  if (!data?.changes || data.changes.length === 0) {
    return (
      <div className="animate-fade-in-up stagger-6 relative overflow-hidden rounded-lg border border-border bg-card backdrop-blur-sm p-8 text-center">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <div className="font-mono text-[10px] tracking-[0.2em] text-text-muted mb-3 uppercase">
          Class Changes
        </div>
        <div className="font-mono text-xs text-text-dim">
          No class change data yet. Re-sync to populate class-level tracking.
        </div>
        <div className="font-mono text-[10px] text-text-muted mt-2">
          New syncs will automatically track individual class additions and removals.
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up stagger-6 relative overflow-hidden rounded-lg border border-border bg-card backdrop-blur-sm">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      {/* Header */}
      <div className="p-5 pb-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] text-text-muted mb-2 uppercase">
              Class Changes Summary
            </div>
            <div className="font-mono text-[10px] text-text-dim">
              Across {data.totalSnapshots} snapshots &middot; {data.changes.length} transitions with changes
            </div>
          </div>
        </div>

        {/* Aggregate stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Added total */}
          <div className="relative overflow-hidden rounded-lg border border-positive/10 bg-positive/[0.03] px-4 py-3">
            <div className="absolute inset-0 bg-gradient-to-br from-positive/5 to-transparent" />
            <div className="relative">
              <div className="font-mono text-[9px] tracking-wider uppercase text-positive/60 mb-1">Added</div>
              <div className="font-mono text-xl font-light text-positive">+{totals.added}</div>
              <div className="font-mono text-[10px] text-text-muted mt-0.5">classes</div>
            </div>
          </div>

          {/* Removed total */}
          <div className="relative overflow-hidden rounded-lg border border-negative/10 bg-negative/[0.03] px-4 py-3">
            <div className="absolute inset-0 bg-gradient-to-br from-negative/5 to-transparent" />
            <div className="relative">
              <div className="font-mono text-[9px] tracking-wider uppercase text-negative/60 mb-1">Removed</div>
              <div className="font-mono text-xl font-light text-negative">&minus;{totals.removed}</div>
              <div className="font-mono text-[10px] text-text-muted mt-0.5">classes</div>
            </div>
          </div>

          {/* Net change */}
          <div className="relative overflow-hidden rounded-lg border border-accent/10 bg-accent/[0.03] px-4 py-3">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
            <div className="relative">
              <div className="font-mono text-[9px] tracking-wider uppercase text-accent/60 mb-1">Net</div>
              <div className={`font-mono text-xl font-light ${totals.net > 0 ? 'text-positive' : totals.net < 0 ? 'text-negative' : 'text-text-dim'}`}>
                {totals.net > 0 ? '+' : ''}{totals.net}
              </div>
              <div className="font-mono text-[10px] text-text-muted mt-0.5">delta</div>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4">
          {[
            { key: 'all', label: 'All' },
            { key: 'added', label: 'Added only' },
            { key: 'removed', label: 'Removed only' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`font-mono text-[10px] tracking-wider uppercase px-3 py-1.5 rounded border transition-all duration-200 cursor-pointer
                ${filter === tab.key
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-border text-text-muted hover:text-text-dim hover:border-border-light'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Change list */}
      <div className="px-5 pb-5 space-y-1 max-h-[420px] overflow-y-auto">
        {filteredChanges.map((change, i) => (
          <ChangeGroup key={`${change.from_commit}-${change.to_commit}`} change={change} index={i} />
        ))}
      </div>
    </div>
  );
}
