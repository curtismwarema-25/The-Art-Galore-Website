import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-md border border-border bg-background/75 p-8 text-center md:p-10">
      <h3 className="font-display text-xl text-foreground mb-2">{title}</h3>
      <p className="text-sm text-foreground-secondary max-w-xl mx-auto mb-4">{description}</p>
      {action}
    </div>
  );
}
