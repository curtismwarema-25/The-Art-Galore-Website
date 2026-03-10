import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-8 md:p-10 text-center">
      <h3 className="font-display text-xl text-foreground mb-2">{title}</h3>
      <p className="text-sm text-foreground-secondary max-w-xl mx-auto mb-4">{description}</p>
      {action}
    </div>
  );
}
