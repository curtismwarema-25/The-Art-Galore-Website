import { Minus, Plus } from "lucide-react";
import type { TicketTier } from "@/types/models";

type TicketTierSelectorProps = {
  tiers: TicketTier[];
  quantities: Record<string, number>;
  onIncrease: (tierId: string) => void;
  onDecrease: (tierId: string) => void;
};

export default function TicketTierSelector({
  tiers,
  quantities,
  onIncrease,
  onDecrease,
}: TicketTierSelectorProps) {
  return (
    <div className="space-y-3">
      {tiers.map((tier) => (
        <article key={tier.id} className="border border-border rounded-md p-4 bg-background">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h4 className="font-display text-sm text-foreground">{tier.name}</h4>
              <p className="text-xs text-foreground-secondary">{tier.perks.join(" | ")}</p>
            </div>
            <p className="font-display text-sm text-foreground">
              {tier.currency} {tier.price.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-accent">{tier.available} left</p>
            <div className="flex items-center border border-border rounded-md">
              <button type="button" onClick={() => onDecrease(tier.id)} className="p-2 text-foreground-secondary hover:text-foreground">
                <Minus size={14} />
              </button>
              <span className="w-8 text-center font-display text-sm text-foreground">
                {quantities[tier.id] ?? 0}
              </span>
              <button type="button" onClick={() => onIncrease(tier.id)} className="p-2 text-foreground-secondary hover:text-foreground">
                <Plus size={14} />
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
