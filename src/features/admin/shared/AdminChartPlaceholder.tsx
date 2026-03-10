export default function AdminChartPlaceholder({ title, series }: { title: string; series: Array<{ label: string; value: number }> }) {
  const maxValue = Math.max(...series.map((point) => point.value));

  return (
    <article className="rounded-lg border border-border bg-card p-4 md:p-5">
      <h3 className="font-display text-sm tracking-[0.12em] uppercase text-foreground-secondary mb-4">{title}</h3>
      <div className="space-y-3">
        {series.map((point) => (
          <div key={point.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-foreground-secondary">
              <span>{point.label}</span>
              <span>{point.value}</span>
            </div>
            <div className="h-2 rounded-sm bg-secondary/35 overflow-hidden">
              <div className="h-full bg-accent/80 transition-all" style={{ width: `${(point.value / maxValue) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
