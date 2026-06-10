import { ArrowUpRight, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import type { PersonRecord } from "@/types/models";

type ArtistCardProps = {
  artist: PersonRecord;
};

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

export default function ArtistCard({ artist }: ArtistCardProps) {
  const featuredWork = artist.featuredWorks[0];
  const eventCount = artist.eventsParticipated.length;
  const image = artist.coverImage || artist.image;
  const artForms = [artist.primaryArtForm, artist.secondaryArtForm].filter(Boolean);

  return (
    <Link
      to={`/artists/${artist.slug}`}
      className="group grid h-full overflow-hidden rounded-md border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/45 hover:shadow-[0_18px_36px_-24px_hsl(var(--foreground)/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative overflow-hidden">
        <img
          src={image}
          alt={artist.name}
          className="w-full aspect-[5/4] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 rounded-md bg-background/90 px-2.5 py-1 text-[10px] font-display uppercase tracking-[0.16em] text-accent shadow-sm">
          {artist.category === "leadership" ? "Leadership" : "Member"}
        </div>
      </div>

      <div className="grid gap-4 p-4 md:p-5">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg md:text-xl leading-tight text-foreground">
                {artist.preferredName && artist.preferredName !== artist.name ? artist.preferredName : artist.name}
              </h3>
              <p className="mt-1 text-sm text-foreground-secondary">{artist.role}</p>
            </div>
            <ArrowUpRight
              size={18}
              className="mt-1 shrink-0 text-foreground-secondary transition-colors group-hover:text-accent"
              aria-hidden="true"
            />
          </div>

          <p className="text-xs font-display uppercase tracking-[0.14em] text-accent">{artist.medium}</p>
          
          {artForms.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {artForms.map((form) => (
                <span key={form} className="inline-block px-2 py-1 text-[10px] font-display uppercase tracking-[0.1em] border border-border/50 text-foreground-secondary bg-background/40 rounded">
                  {form}
                </span>
              ))}
            </div>
          )}

          {artist.yearsPracticing && (
            <p className="text-xs text-foreground-secondary mt-2">
              <span className="font-display">{artist.yearsPracticing}</span> of practice
            </p>
          )}

          <p className="text-sm leading-relaxed text-foreground-secondary">
            {truncateText(artist.bio, 130)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {featuredWork && (
            <span className="rounded-md border border-border bg-background/60 px-2.5 py-1 text-xs text-foreground-secondary">
              {truncateText(featuredWork, 34)}
            </span>
          )}
          {eventCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2.5 py-1 text-xs text-foreground-secondary">
              <CalendarDays size={12} aria-hidden="true" />
              {eventCount} {eventCount === 1 ? "event" : "events"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
