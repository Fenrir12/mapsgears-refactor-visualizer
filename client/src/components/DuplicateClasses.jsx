import { useState, useMemo } from 'react';
import { useDuplicates } from '../hooks/useApi';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function DuplicateEntry({ dup, targetFolder, compareFolder, index }) {
  const [expanded, setExpanded] = useState(false);
  const targetShort = targetFolder?.split('/').pop() || 'target';
  const compareShort = compareFolder?.split('/').pop() || 'compare';

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: `${index * 0.02}s` }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full cursor-pointer group">
        <div className="flex items-center gap-3 px-3 py-2 rounded border border-java/10 bg-java/[0.03] hover:bg-java/[0.06] transition-all duration-200">
          <svg className="w-3.5 h-3.5 text-java/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-mono text-xs text-text-bright">{dup.name}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded bg-java/10 text-java">
              {targetShort} ({dup.targetFiles.length})
            </span>
            <span className="font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded bg-kotlin/10 text-kotlin">
              {compareShort} ({dup.compareFiles.length})
            </span>
          </div>
          <svg className={`w-3 h-3 text-text-muted transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="ml-7 mt-1 space-y-0.5 pb-1">
          {dup.targetFiles.map((f, i) => (
            <div key={`t-${i}`} className="flex items-center gap-2 px-3 py-1 rounded bg-java/[0.02]">
              <span className={`font-mono text-[9px] px-1 rounded ${f.language === 'java' ? 'bg-java/10 text-java' : 'bg-kotlin/10 text-kotlin'}`}>
                {f.language === 'java' ? 'JV' : 'KT'}
              </span>
              <span className="font-mono text-[9px] px-1 rounded bg-border text-text-muted">{targetShort}</span>
              <span className="font-mono text-[10px] text-text-dim truncate">{f.file.split('/').slice(-3).join('/')}</span>
            </div>
          ))}
          {dup.compareFiles.map((f, i) => (
            <div key={`c-${i}`} className="flex items-center gap-2 px-3 py-1 rounded bg-kotlin/[0.02]">
              <span className={`font-mono text-[9px] px-1 rounded ${f.language === 'java' ? 'bg-java/10 text-java' : 'bg-kotlin/10 text-kotlin'}`}>
                {f.language === 'java' ? 'JV' : 'KT'}
              </span>
              <span className="font-mono text-[9px] px-1 rounded bg-border text-text-muted">{compareShort}</span>
              <span className="font-mono text-[10px] text-text-dim truncate">{f.file.split('/').slice(-3).join('/')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DuplicateTrendChart({ trend, gradientId }) {
  if (!trend || trend.length < 2) return null;
  const chartData = trend.map(t => ({
    date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    duplicates: t.count,
  }));

  return (
    <div className="h-28">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fill: '#4a4a6a', fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#4a4a6a', fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ background: '#14142166', border: '1px solid #2a2a44', borderRadius: 6, fontFamily: 'JetBrains Mono', fontSize: 10, color: '#d4d4f0' }}
            formatter={(value) => [`${value} duplicates`, 'Count']} />
          <Area type="monotone" dataKey="duplicates" stroke="#f59e0b" strokeWidth={1.5} fill={`url(#${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function PairSection({ pair, index }) {
  const [search, setSearch] = useState('');
  const targetShort = pair.targetFolder?.split('/').pop() || 'target';
  const compareShort = pair.compareFolder?.split('/').pop() || 'compare';

  const filtered = useMemo(() => {
    if (!pair.duplicates) return [];
    if (!search) return pair.duplicates;
    const q = search.toLowerCase();
    return pair.duplicates.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.targetFiles.some(f => f.file.toLowerCase().includes(q)) ||
      d.compareFiles.some(f => f.file.toLowerCase().includes(q))
    );
  }, [pair, search]);

  if (pair.count === 0) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-border bg-card backdrop-blur-sm p-6 text-center">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-positive/40 to-transparent" />
        <div className="font-mono text-[10px] text-text-dim flex items-center justify-center gap-1.5 mb-2">
          <span className="px-1 rounded bg-java/10 text-java">{targetShort}</span>
          <span>&harr;</span>
          <span className="px-1 rounded bg-kotlin/10 text-kotlin">{compareShort}</span>
        </div>
        <div className="font-mono text-xs text-positive">No duplicates!</div>
      </div>
    );
  }

  const totalClasses = pair.targetClasses + pair.compareClasses;
  const cleanPct = ((1 - pair.count / totalClasses) * 100).toFixed(1);

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card backdrop-blur-sm">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-java/40 to-transparent" />

      <div className="p-5 pb-0">
        {/* Pair header */}
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-text-dim mb-4">
          <span className="px-1.5 py-0.5 rounded bg-java/10 text-java">{targetShort}</span>
          <span>&harr;</span>
          <span className="px-1.5 py-0.5 rounded bg-kotlin/10 text-kotlin">{compareShort}</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="relative overflow-hidden rounded-lg border border-java/10 bg-java/[0.03] px-3 py-2">
            <div className="font-mono text-[9px] tracking-wider uppercase text-java/60 mb-0.5">Duplicates</div>
            <div className="font-mono text-lg font-light text-java">{pair.count}</div>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-border bg-surface/50 px-3 py-2">
            <div className="font-mono text-[9px] tracking-wider uppercase text-text-muted mb-0.5">{targetShort}</div>
            <div className="font-mono text-lg font-light text-text-bright">{pair.targetClasses}</div>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-border bg-surface/50 px-3 py-2">
            <div className="font-mono text-[9px] tracking-wider uppercase text-text-muted mb-0.5">{compareShort}</div>
            <div className="font-mono text-lg font-light text-text-bright">{pair.compareClasses}</div>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-positive/10 bg-positive/[0.03] px-3 py-2">
            <div className="font-mono text-[9px] tracking-wider uppercase text-positive/60 mb-0.5">Clean</div>
            <div className="font-mono text-lg font-light text-positive">{cleanPct}%</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${cleanPct}%`, background: 'linear-gradient(90deg, #10b981, #06b6d4)' }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono text-[9px] text-java">{pair.count} duplicated</span>
            <span className="font-mono text-[9px] text-positive">{totalClasses - pair.count} unique</span>
          </div>
        </div>

        {/* Trend */}
        {pair.trend && pair.trend.length >= 2 && (
          <div className="mb-4">
            <div className="font-mono text-[9px] tracking-wider uppercase text-text-muted mb-1">Trend</div>
            <DuplicateTrendChart trend={pair.trend} gradientId={`dupGrad-${index}`} />
          </div>
        )}

        {/* Search */}
        <div className="mb-3">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search duplicates..."
            className="w-full bg-surface border border-border rounded px-3 py-1.5 font-mono text-[11px] text-text-bright
              focus:outline-none focus:border-java/30 transition-colors placeholder:text-text-muted [color-scheme:dark]" />
        </div>
      </div>

      {/* List */}
      <div className="px-5 pb-5 space-y-1 max-h-[320px] overflow-y-auto">
        {filtered.length === 0 && search ? (
          <div className="text-center py-4 font-mono text-[11px] text-text-muted">No matches for &ldquo;{search}&rdquo;</div>
        ) : (
          filtered.map((dup, i) => (
            <DuplicateEntry key={dup.name} dup={dup} targetFolder={pair.targetFolder} compareFolder={pair.compareFolder} index={i} />
          ))
        )}
      </div>
    </div>
  );
}

export default function DuplicateClasses() {
  const { data, loading } = useDuplicates();

  if (loading) {
    return (
      <div className="animate-fade-in-up stagger-7 rounded-lg border border-border bg-card backdrop-blur-sm p-5">
        <div className="h-6 w-48 loading-shimmer rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-10 loading-shimmer rounded" />)}
        </div>
      </div>
    );
  }

  if (!data?.pairs || data.pairs.length === 0) {
    return (
      <div className="animate-fade-in-up stagger-7 relative overflow-hidden rounded-lg border border-border bg-card backdrop-blur-sm p-8 text-center">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-java/40 to-transparent" />
        <div className="font-mono text-[10px] tracking-[0.2em] text-text-muted mb-3 uppercase">Double Implementations</div>
        <div className="font-mono text-xs text-text-dim">
          {data?.needsSync ? 'Need to sync folders first. Run a sync.' : data?.error || 'No comparison data available.'}
        </div>
      </div>
    );
  }

  // Aggregate stats across all pairs
  const totalDuplicates = data.pairs.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="animate-fade-in-up stagger-7 space-y-4">
      {/* Section header */}
      <div className="flex items-baseline gap-3">
        <div className="font-mono text-[10px] tracking-[0.2em] text-text-muted uppercase">
          Double Implementations
        </div>
        <div className="font-mono text-[10px] text-java">
          {totalDuplicates} total across {data.pairs.length} folder {data.pairs.length === 1 ? 'pair' : 'pairs'}
        </div>
      </div>

      {/* One card per comparison pair */}
      {data.pairs.map((pair, i) => (
        <PairSection key={pair.targetFolder} pair={pair} index={i} />
      ))}
    </div>
  );
}
