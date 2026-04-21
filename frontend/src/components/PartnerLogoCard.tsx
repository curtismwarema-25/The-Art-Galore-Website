import { ArrowUpRight } from "lucide-react";
import type { PartnerRecord } from "@/types/models";

type PartnerLogoCardProps = {
  partner: PartnerRecord;
  compact?: boolean;
};

export default function PartnerLogoCard({ partner, compact = false }: PartnerLogoCardProps) {
  return (
    <article className="group border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_32px_-20px_hsl(var(--foreground)/0.35)]">
      <div className="mb-5 rounded-sm border border-border/70 bg-secondary/25 px-4 py-6 text-center">
        <p className="font-display text-xl md:text-2xl font-bold tracking-[0.2em] text-foreground/75">
          {partner.logoText}
        </p>
      </div>

      <h3 className="font-display text-lg font-semibold text-foreground mb-2">{partner.name}</h3>

      {!compact && (
        <>
          <p className="mb-2 text-[10px] font-display tracking-[0.16em] uppercase text-accent">
            {partner.partnershipType}
          </p>
          <p className="text-sm text-foreground-secondary font-body leading-relaxed mb-4">
            {partner.description}
          </p>
        </>
      )}

      {!compact && partner.website && (
        <a
          href={partner.website}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-display tracking-wider uppercase text-accent hover:opacity-80 transition-opacity"
        >
          Visit Website <ArrowUpRight size={13} />
        </a>
      )}
    </article>
  );
}
