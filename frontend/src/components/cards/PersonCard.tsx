import { Link } from "react-router-dom";
import type { PersonRecord } from "@/types/models";

type PersonCardProps = {
  person: PersonRecord;
  compact?: boolean;
};

export default function PersonCard({ person, compact = false }: PersonCardProps) {
  return (
    <article className="border border-border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-20px_hsl(var(--foreground)/0.35)]">
      {!compact && (
        <img src={person.image} alt={person.name} className="w-full aspect-[4/5] object-cover" />
      )}
      <div className="p-4">
        <p className="font-display text-[10px] tracking-[0.18em] uppercase text-accent mb-2">
          {person.category}
        </p>
        <h3 className="font-display text-lg text-foreground mb-1">{person.name}</h3>
        <p className="text-sm text-foreground-secondary mb-3">{person.role}</p>
        {person.isArtist && (
          <Link
            to={`/artists/${person.slug}`}
            className="text-xs font-display tracking-[0.16em] uppercase text-accent hover:opacity-80"
          >
            View Artist Profile
          </Link>
        )}
      </div>
    </article>
  );
}
