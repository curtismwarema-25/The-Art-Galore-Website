import type { ReactNode } from "react";

export default function AdminSectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 md:p-6">
      <h2 className="font-display text-base md:text-lg text-foreground mb-4">{title}</h2>
      {description && <p className="-mt-2 mb-4 text-sm text-foreground-secondary">{description}</p>}
      {children}
    </section>
  );
}
