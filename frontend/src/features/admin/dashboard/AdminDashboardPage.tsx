import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  MapPin,
  Ticket,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/common/EmptyState";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import SectionHeader from "@/components/common/SectionHeader";
import StatCard from "@/components/common/StatCard";
import { useAuth } from "@/features/auth/useAuth";
import AdminSectionCard from "@/features/admin/shared/AdminSectionCard";
import { useAdminEventsQuery } from "@/hooks/queries/useAdminEventsQuery";
import { useAdminStatsQuery } from "@/hooks/queries/useAdminStatsQuery";
import type { EventRecord } from "@/types/models";

type AttentionItem = {
  label: string;
  description: string;
  count: number;
  href: string;
  icon: LucideIcon;
};

function getNextEvent(events: EventRecord[] | undefined) {
  return [...(events ?? [])]
    .filter((event) => event.lifecycle === "upcoming")
    .sort((first, second) => {
      const firstTime = Date.parse(first.startAt);
      const secondTime = Date.parse(second.startAt);
      return (Number.isNaN(firstTime) ? Number.MAX_SAFE_INTEGER : firstTime) -
        (Number.isNaN(secondTime) ? Number.MAX_SAFE_INTEGER : secondTime);
    })[0];
}

function formatEventDate(event: EventRecord) {
  const date = new Date(event.startAt);

  if (Number.isNaN(date.getTime())) {
    return event.date;
  }

  return date.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const statsQuery = useAdminStatsQuery();
  const eventsQuery = useAdminEventsQuery();
  const stats = statsQuery.data;
  const nextEvent = getNextEvent(eventsQuery.data);
  const eventsUnavailable = eventsQuery.isError;
  const firstName = user?.fullName?.trim().split(/\s+/)[0] || "there";

  if (statsQuery.isLoading || eventsQuery.isLoading) {
    return <LoadingSkeleton rows={4} />;
  }

  if (statsQuery.isError || !stats) {
    return (
      <EmptyState
        title="Dashboard unavailable"
        description="Your ticket and event overview could not be loaded. Refresh the page to try again."
      />
    );
  }

  const attentionItems: AttentionItem[] = [
    {
      label: "Orders and payments",
      description: "Review pending, failed, or manually submitted payments.",
      count: stats.pendingOrders,
      href: "/admin/orders",
      icon: Ticket,
    },
    {
      label: "Community uploads",
      description: "Approve or reject images waiting for moderation.",
      count: stats.pendingUploads,
      href: "/admin/uploads",
      icon: Upload,
    },
  ];
  const hasAttention = attentionItems.some((item) => item.count > 0);

  return (
    <div className="space-y-5 md:space-y-6">
      <SectionHeader
        title={`Welcome, ${firstName}`}
        subtitle={eventsUnavailable ? "Event details are unavailable. Refresh to try again." : nextEvent ? `Next on your calendar: ${nextEvent.title}.` : "Create an event to start preparing its ticket tiers."}
        action={
          eventsUnavailable ? (
            <Button variant="accent" onClick={() => void eventsQuery.refetch()}>
              <CalendarDays aria-hidden="true" />
              Refresh events
            </Button>
          ) : (
            <Button variant="accent" asChild>
              <Link to="/admin/events">
                <CalendarDays aria-hidden="true" />
                {nextEvent ? "Manage event" : "Create event"}
              </Link>
            </Button>
          )
        }
      />

      <section className="overflow-hidden rounded-lg border border-accent/30 bg-accent/10" aria-labelledby="next-event-heading">
        <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
          <div>
            <p className="font-display text-[10px] tracking-[0.2em] uppercase text-accent">Next event</p>
            {eventsUnavailable ? (
              <>
                <h2 id="next-event-heading" className="mt-2 font-display text-2xl text-foreground md:text-3xl">
                  Event details unavailable
                </h2>
                <p className="mt-2 max-w-xl text-sm text-foreground-secondary">
                  Event details could not be loaded, so there is no event information to show.
                </p>
              </>
            ) : nextEvent ? (
              <>
                <h2 id="next-event-heading" className="mt-2 font-display text-2xl text-foreground md:text-3xl">
                  {nextEvent.title}
                </h2>
                <div className="mt-3 flex flex-col gap-2 text-sm text-foreground-secondary sm:flex-row sm:flex-wrap sm:gap-x-5">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays size={16} className="text-accent" aria-hidden="true" />
                    {formatEventDate(nextEvent)} | {nextEvent.time}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={16} className="text-accent" aria-hidden="true" />
                    {nextEvent.venue}
                  </span>
                </div>
              </>
            ) : (
              <>
                <h2 id="next-event-heading" className="mt-2 font-display text-2xl text-foreground md:text-3xl">
                  No upcoming events
                </h2>
                <p className="mt-2 max-w-xl text-sm text-foreground-secondary">
                  Create an event, add its ticket tiers, then publish it when the details are ready.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            {eventsUnavailable ? (
              <Button variant="accent" onClick={() => void eventsQuery.refetch()}>
                Refresh events <ArrowRight aria-hidden="true" />
              </Button>
            ) : nextEvent ? (
              <>
                <Button variant="accent" asChild>
                  <Link to="/admin/events">Manage event <ArrowRight aria-hidden="true" /></Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/events/${nextEvent.slug}`} target="_blank" rel="noreferrer">
                    View public page <ExternalLink aria-hidden="true" />
                  </Link>
                </Button>
              </>
            ) : (
              <Button variant="accent" asChild>
                <Link to="/admin/events">Create your first event <ArrowRight aria-hidden="true" /></Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 md:p-6" aria-labelledby="attention-heading">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="attention-heading" className="font-display text-xl text-foreground">Needs your attention</h2>
            <p className="mt-1 text-sm text-foreground-secondary">Review pending orders and community uploads that need a decision.</p>
          </div>
          {hasAttention && <span className="text-xs font-display uppercase tracking-[0.14em] text-accent">{attentionItems.filter((item) => item.count > 0).length} items</span>}
        </div>

        {hasAttention ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {attentionItems.filter((item) => item.count > 0).map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="group flex items-center justify-between gap-4 rounded-md border border-border bg-secondary/20 p-4 transition-colors hover:border-accent/50 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <span className="flex min-w-0 items-start gap-3">
                  <item.icon size={19} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block font-display text-foreground">{item.label}</span>
                    <span className="mt-1 block text-sm text-foreground-secondary">{item.description}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-accent px-2 py-1 text-xs font-display text-accent-foreground">{item.count}</span>
                  <ArrowRight size={16} className="text-foreground-secondary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-3 rounded-md border border-border bg-secondary/20 p-4 text-sm text-foreground-secondary">
            <CheckCircle2 size={20} className="shrink-0 text-accent" aria-hidden="true" />
            <span>No orders or community uploads need a decision right now.</span>
          </div>
        )}
      </section>

      <section aria-labelledby="snapshot-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 id="snapshot-heading" className="font-display text-xl text-foreground">Ticket overview</h2>
            <p className="mt-1 text-sm text-foreground-secondary">Totals across all events.</p>
          </div>
          <Link to="/admin/orders" className="inline-flex items-center gap-1 text-xs font-display uppercase tracking-[0.12em] text-accent hover:opacity-80">
            Open orders <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
          <StatCard label="Tickets sold" value={stats.ticketsSold.toLocaleString()} detail="Across all events" />
          <StatCard label="Paid orders" value={stats.paidOrders.toLocaleString()} detail="Payment confirmed" />
          <StatCard label="Published artists" value={stats.artistsCount.toLocaleString()} detail="Public profiles" />
        </div>
      </section>

      <AdminSectionCard title="Quick actions" description="Open a tool to manage events, guests, or profiles.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button variant="accent" size="lg" className="justify-start" asChild>
            <Link to="/admin/events"><Ticket aria-hidden="true" /> Manage events</Link>
          </Button>
          <Button variant="outline" size="lg" className="justify-start" asChild>
            <Link to="/admin/checkin"><ClipboardCheck aria-hidden="true" /> Check in guests</Link>
          </Button>
          <Button variant="outline" size="lg" className="justify-start" asChild>
            <Link to="/admin/people"><Users aria-hidden="true" /> Update profiles</Link>
          </Button>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Keep the public site accurate" description="Update these areas when event information changes." defaultOpen={false}>
        <div className="grid grid-cols-1 gap-3 text-sm text-foreground-secondary md:grid-cols-3">
          <Link to="/admin/events" className="rounded-md border border-border bg-background p-4 transition-colors hover:border-accent/50 hover:text-foreground">
            <span className="block font-display text-foreground">Events and ticket tiers</span>
            <span className="mt-1 block">Dates, venues, prices, and availability.</span>
          </Link>
          <Link to="/admin/settings" className="rounded-md border border-border bg-background p-4 transition-colors hover:border-accent/50 hover:text-foreground">
            <span className="block font-display text-foreground">Homepage and contact</span>
            <span className="mt-1 block">Hero copy, links, and support details.</span>
          </Link>
          <Link to="/admin/people" className="rounded-md border border-border bg-background p-4 transition-colors hover:border-accent/50 hover:text-foreground">
            <span className="block font-display text-foreground">People and artists</span>
            <span className="mt-1 block">Profiles, roles, and public bios.</span>
          </Link>
        </div>
      </AdminSectionCard>
    </div>
  );
}
