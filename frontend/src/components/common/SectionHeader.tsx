import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export default function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-display text-xl text-foreground md:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-foreground-secondary">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{action}</div>}
    </div>
  );
}
