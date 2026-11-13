import { Link } from "react-router-dom";
import { ArrowUpRight, Calendar, MapPin } from "lucide-react";
import type { EventRecord } from "@/types/models";
import StatusBadge from "@/components/common/StatusBadge";

type EventCardProps = {
  event: EventRecord;
};

export default function EventCard({ event }: EventCardProps) {
  return (
    <article className="group overflow-hidden border border-border bg-card transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-accent/45 hover:shadow-[var(--shadow-soft)]">
      <img src={event.heroImage} alt={event.title} className="w-full aspect-[4/5] object-cover" />
      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="font-display text-[10px] tracking-[0.18em] uppercase text-editorial">{event.type}</p>
          <StatusBadge tone={event.lifecycle === "past" ? "approved" : "published"} label={event.lifecycle} />
        </div>
        <h3 className="font-editorial text-2xl text-foreground mb-2">{event.title}</h3>
        <p className="text-sm text-foreground-secondary mb-3">{event.summary}</p>
        <div className="editorial-rule space-y-1.5 pt-3 text-xs text-foreground-secondary mb-4">
          <p className="inline-flex items-center gap-1.5">
            <Calendar size={13} className="text-accent" /> {event.date} | {event.time}
          </p>
          <p className="inline-flex items-center gap-1.5">
            <MapPin size={13} className="text-accent" /> {event.venue}
          </p>
        </div>
        <Link
          to={`/events/${event.slug}`}
          className="inline-flex items-center gap-2 text-xs font-display tracking-[0.16em] uppercase text-accent transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          View event <ArrowUpRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </article>
  );
}
