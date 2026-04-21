import { Link } from "react-router-dom";
import type { PersonRecord } from "@/types/models";

type ArtistCardProps = {
  artist: PersonRecord;
};

export default function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <Link
      to={`/artists/${artist.slug}`}
      className="group block border border-border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-20px_hsl(var(--foreground)/0.35)]"
    >
      <img
        src={artist.image}
        alt={artist.name}
        className="w-full aspect-[4/5] object-cover group-hover:scale-[1.02] transition-transform duration-500"
      />
      <div className="p-4">
        <p className="mb-2 text-[10px] font-display tracking-[0.16em] uppercase text-accent">
          {artist.category}
        </p>
        <h3 className="font-display text-lg text-foreground mb-1">{artist.name}</h3>
        <p className="text-sm text-foreground-secondary">{artist.medium}</p>
      </div>
    </Link>
  );
}
