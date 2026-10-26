import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

type AdminSectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
};

export default function AdminSectionCard({ title, description, children, defaultOpen = true, id }: AdminSectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      id={id}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className="group rounded-md border border-border bg-secondary/75 p-5 shadow-sm md:p-6"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block font-display text-base md:text-lg text-foreground">{title}</span>
          {description && <span className="mt-1 block text-sm text-foreground-secondary">{description}</span>}
        </span>
        <ChevronDown size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-foreground-secondary transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-5">{children}</div>
    </details>
  );
}
