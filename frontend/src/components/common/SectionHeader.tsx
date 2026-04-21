import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export default function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
      <div>
        <h2 className="font-display text-2xl md:text-3xl text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-foreground-secondary mt-2 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
