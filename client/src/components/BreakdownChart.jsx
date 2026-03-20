import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = {
  java: '#f59e0b',
  kotlin: '#06b6d4',
};

export default function BreakdownChart({ latest }) {
  const javaLines = latest?.java_lines ?? 0;
  const kotlinLines = latest?.kotlin_lines ?? 0;
  const total = javaLines + kotlinLines;

  const data = [
    { name: 'Java', value: javaLines },
    { name: 'Kotlin', value: kotlinLines },
  ];

  const javaPct = total > 0 ? ((javaLines / total) * 100).toFixed(1) : '0.0';
  const kotlinPct = total > 0 ? ((kotlinLines / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="animate-fade-in-up stagger-4 relative overflow-hidden rounded-lg border border-border bg-card backdrop-blur-sm p-5">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <div className="font-mono text-[10px] tracking-[0.2em] text-text-muted mb-4 uppercase">
        Language Breakdown
      </div>

      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative w-36 h-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={42}
                outerRadius={62}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[entry.name.toLowerCase()]}
                    style={{ filter: `drop-shadow(0 0 6px ${COLORS[entry.name.toLowerCase()]}66)` }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-mono text-lg font-light text-text-white">{total.toLocaleString()}</span>
            <span className="font-mono text-[9px] text-text-muted tracking-wider uppercase">lines</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-4 flex-1">
          <div className="group">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-java shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
              <span className="font-mono text-xs text-text-dim tracking-wider uppercase">Java</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xl font-light text-java">{javaPct}%</span>
              <span className="font-mono text-[10px] text-text-muted">{javaLines.toLocaleString()} lines</span>
            </div>
            {/* Progress bar */}
            <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-java transition-all duration-700"
                style={{ width: `${javaPct}%` }}
              />
            </div>
          </div>

          <div className="group">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-kotlin shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
              <span className="font-mono text-xs text-text-dim tracking-wider uppercase">Kotlin</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xl font-light text-kotlin">{kotlinPct}%</span>
              <span className="font-mono text-[10px] text-text-muted">{kotlinLines.toLocaleString()} lines</span>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-kotlin transition-all duration-700"
                style={{ width: `${kotlinPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
