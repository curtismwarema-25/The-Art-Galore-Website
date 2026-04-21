type StatCardProps = {
  label: string;
  value: string | number;
  detail?: string;
};

export default function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <article className="rounded-lg border border-border bg-secondary/25 p-4 transition-all duration-200 hover:-translate-y-0.5">
      <p className="font-display text-[10px] tracking-[0.2em] uppercase text-foreground-secondary mb-2">
        {label}
      </p>
      <p className="font-display text-2xl text-foreground leading-none mb-2">{value}</p>
      {detail && <p className="text-xs text-foreground-secondary font-body">{detail}</p>}
    </article>
  );
}
