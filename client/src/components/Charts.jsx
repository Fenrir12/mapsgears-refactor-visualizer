import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border-light rounded-lg p-3 shadow-2xl">
      <div className="font-mono text-[10px] text-text-muted mb-2 tracking-wider uppercase">
        {new Date(label).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="font-mono text-[10px] text-text-dim">{p.name}</span>
          <span className="font-mono text-xs text-text-bright ml-auto tabular-nums">
            {p.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, children, staggerClass }) {
  return (
    <div className={`animate-fade-in-up ${staggerClass} relative overflow-hidden rounded-lg border border-border bg-card backdrop-blur-sm p-5`}>
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="font-mono text-[10px] tracking-[0.2em] text-text-muted mb-4 uppercase">
        {title}
      </div>
      {children}
    </div>
  );
}

export default function Charts({ snapshots }) {
  const chartData = snapshots.map((s) => ({
    ...s,
    date: s.commit_date,
    dateLabel: formatDate(s.commit_date),
  }));

  const commonProps = {
    data: chartData,
    margin: { top: 4, right: 4, left: -20, bottom: 0 },
  };

  const axisStyle = {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10,
    fill: '#4a4a6a',
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Lines of code chart */}
      <ChartCard title="Lines of Code Over Time" staggerClass="stagger-5">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient id="javaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="kotlinGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#6b6b8a' }}
              />
              <Area
                type="monotone"
                dataKey="java_lines"
                name="Java"
                stackId="1"
                stroke="#f59e0b"
                strokeWidth={1.5}
                fill="url(#javaGrad)"
              />
              <Area
                type="monotone"
                dataKey="kotlin_lines"
                name="Kotlin"
                stackId="1"
                stroke="#06b6d4"
                strokeWidth={1.5}
                fill="url(#kotlinGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Two-column: Classes + Files */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Classes Over Time" staggerClass="stagger-6">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart {...commonProps}>
                <defs>
                  <linearGradient id="javaClassGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="kotlinClassGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="java_classes" name="Java" stroke="#f59e0b" strokeWidth={1.5} fill="url(#javaClassGrad)" />
                <Area type="monotone" dataKey="kotlin_classes" name="Kotlin" stroke="#06b6d4" strokeWidth={1.5} fill="url(#kotlinClassGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Files Over Time" staggerClass="stagger-7">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart {...commonProps}>
                <defs>
                  <linearGradient id="javaFileGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="kotlinFileGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="java_files" name="Java" stroke="#f59e0b" strokeWidth={1.5} fill="url(#javaFileGrad)" />
                <Area type="monotone" dataKey="kotlin_files" name="Kotlin" stroke="#06b6d4" strokeWidth={1.5} fill="url(#kotlinFileGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
