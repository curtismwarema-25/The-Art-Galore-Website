import { CalendarDays, ExternalLink, Users } from "lucide-react";
import { Link } from "react-router-dom";
import type { EventRecord } from "@/types/models";
import StatusBadge from "@/components/common/StatusBadge";
import { formatAdminStatus } from "@/features/admin/shared/utils";

export type AdminEventWorkspaceSection = "overview" | "tickets" | "orders" | "guests";

type AdminEventWorkspaceNavProps = {
  event: EventRecord;
  currentSection: AdminEventWorkspaceSection;
  ticketSummary?: {
    tierCount: number;
    allocatedQuantity: number;
    remainingQuantity: number;
  };
};

const sectionLabels: Array<{ key: AdminEventWorkspaceSection; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "tickets", label: "Tickets" },
  { key: "orders", label: "Orders" },
  { key: "guests", label: "Guests" },
];

function sectionPath(eventId: string, section: AdminEventWorkspaceSection) {
  if (section === "overview") return `/admin/events/${eventId}`;
  if (section === "tickets") return `/admin/events/${eventId}/tickets`;
  if (section === "orders") return `/admin/orders?eventId=${encodeURIComponent(eventId)}`;
  return `/admin/checkin?eventId=${encodeURIComponent(eventId)}`;
}

function statusTone(status: EventRecord["status"]) {
  if (status === "published") return "published" as const;
  if (status === "draft") return "draft" as const;
  return "failed" as const;
}

export default function AdminEventWorkspaceNav({ event, currentSection, ticketSummary }: AdminEventWorkspaceNavProps) {
  return (
    <section className="rounded-lg border border-accent/30 bg-accent/5 p-4 md:p-5" aria-labelledby="event-workspace-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            to="/admin/events"
            className="text-[11px] font-display uppercase tracking-[0.14em] text-accent hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Back to all events
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h2 id="event-workspace-heading" className="font-display text-xl text-foreground md:text-2xl">
              {event.title}
            </h2>
            <StatusBadge tone={statusTone(event.status)} label={formatAdminStatus(event.status)} />
          </div>
          <div className="mt-3 grid gap-1 text-xs text-foreground-secondary sm:grid-cols-2 lg:grid-cols-4">
            <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} aria-hidden="true" />{event.date}</span>
            <span>{event.time}</span>
            <span>{event.timezone}</span>
            <span>{event.venue}</span>
          </div>
          {ticketSummary && (
            <p className="mt-3 text-xs text-foreground-secondary">
              {ticketSummary.tierCount} ticket {ticketSummary.tierCount === 1 ? "tier" : "tiers"} · {ticketSummary.allocatedQuantity} allocated · {ticketSummary.remainingQuantity} remaining
            </p>
          )}
        </div>

        <Link
          to={`/events/${event.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-2 text-xs font-display uppercase tracking-[0.12em] text-accent hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          View public page <ExternalLink size={13} aria-hidden="true" />
        </Link>
      </div>

      <nav className="mt-5 border-t border-border/70 pt-3" aria-label={`${event.title} workspace`}>
        <div className="flex flex-wrap gap-2">
          {sectionLabels.map((section) => {
            const isCurrent = currentSection === section.key;
            return (
              <Link
                key={section.key}
                to={sectionPath(event.id, section.key)}
                aria-current={isCurrent ? "page" : undefined}
                className={`inline-flex min-h-9 items-center gap-2 border px-3 py-2 text-xs font-display uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  isCurrent
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-background text-foreground-secondary hover:border-accent/50 hover:text-foreground"
                }`}
              >
                {section.key === "guests" && <Users size={13} aria-hidden="true" />}
                {section.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </section>
  );
}
