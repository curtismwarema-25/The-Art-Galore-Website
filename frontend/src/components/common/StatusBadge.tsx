type StatusBadgeTone =
  | "published"
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "paid"
  | "checked-in"
  | "idle"
  | "initiating"
  | "failed"
  | "refunded";

const badgeClassByTone: Record<StatusBadgeTone, string> = {
  published: "bg-accent/18 border-accent/35 text-accent",
  draft: "bg-accent/8 border-accent/22 text-foreground-secondary",
  pending: "bg-accent/12 border-accent/28 text-accent",
  approved: "bg-accent/22 border-accent/40 text-accent",
  rejected: "bg-accent/6 border-accent/18 text-foreground-secondary",
  paid: "bg-accent/24 border-accent/45 text-accent",
  "checked-in": "bg-accent/28 border-accent/50 text-accent",
  idle: "bg-accent/8 border-accent/22 text-foreground-secondary",
  initiating: "bg-accent/12 border-accent/28 text-accent",
  failed: "bg-accent/6 border-accent/18 text-foreground-secondary",
  refunded: "bg-accent/8 border-accent/22 text-foreground-secondary",
};

type StatusBadgeProps = {
  label?: string;
  tone: StatusBadgeTone;
};

export default function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-display tracking-[0.14em] uppercase ${badgeClassByTone[tone]}`}
    >
      {label ?? tone.replace("-", " ")}
    </span>
  );
}
