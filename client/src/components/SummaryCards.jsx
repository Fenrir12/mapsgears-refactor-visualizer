export default function SummaryCards({ snapshots, latest }) {
  const first = snapshots?.[0];

  const cards = [
    {
      label: 'TOTAL LINES',
      value: latest?.total_lines ?? 0,
      delta: first ? (latest?.total_lines ?? 0) - first.total_lines : 0,
      sub: [
        { label: 'Java', value: latest?.java_lines ?? 0, color: 'text-java' },
        { label: 'Kotlin', value: latest?.kotlin_lines ?? 0, color: 'text-kotlin' },
      ],
    },
    {
      label: 'TOTAL CLASSES',
      value: latest?.total_classes ?? 0,
      delta: first ? (latest?.total_classes ?? 0) - first.total_classes : 0,
      sub: [
        { label: 'Java', value: latest?.java_classes ?? 0, color: 'text-java' },
        { label: 'Kotlin', value: latest?.kotlin_classes ?? 0, color: 'text-kotlin' },
      ],
    },
    {
      label: 'TOTAL FILES',
      value: latest?.total_files ?? 0,
      delta: first ? (latest?.total_files ?? 0) - first.total_files : 0,
      sub: [
        { label: 'Java', value: latest?.java_files ?? 0, color: 'text-java' },
        { label: 'Kotlin', value: latest?.kotlin_files ?? 0, color: 'text-kotlin' },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`animate-fade-in-up stagger-${i + 1} relative overflow-hidden rounded-lg border border-border bg-card backdrop-blur-sm p-5`}
        >
          {/* Glow accent */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

          <div className="font-mono text-[10px] tracking-[0.2em] text-text-muted mb-3 uppercase">
            {card.label}
          </div>

          <div className="flex items-baseline gap-3 mb-3">
            <span className="font-mono text-3xl font-light text-text-white tabular-nums">
              {card.value.toLocaleString()}
            </span>
            {card.delta !== 0 && (
              <span
                className={`font-mono text-xs font-medium ${
                  card.delta > 0 ? 'text-positive' : 'text-negative'
                }`}
              >
                {card.delta > 0 ? '+' : ''}{card.delta.toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex gap-4 pt-3 border-t border-border">
            {card.sub.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${s.color === 'text-java' ? 'bg-java' : 'bg-kotlin'}`} />
                <span className="font-mono text-[10px] text-text-dim uppercase tracking-wider">{s.label}</span>
                <span className={`font-mono text-xs font-medium ${s.color}`}>{s.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
