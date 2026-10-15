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
      {tiers.map((tier) => {
        const selectedQuantity = quantities[tier.id] ?? 0;
        const soldOut = tier.available <= 0;
        const atLimit = selectedQuantity >= tier.available;

        return (
          <article key={tier.id} className={`rounded-md border p-4 transition-colors ${selectedQuantity > 0 ? "border-accent bg-accent/5" : "border-border bg-background"}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h4 className="font-display text-sm text-foreground">{tier.name}</h4>
                {tier.perks.length > 0 && <p className="text-xs text-foreground-secondary">{tier.perks.join(" | ")}</p>}
              </div>
              <p className="font-display text-sm text-foreground">
                {tier.currency} {tier.price.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className={`text-xs ${soldOut ? "text-destructive" : "text-accent"}`}>
                {soldOut ? "Sold out" : `${tier.available} left`}
              </p>
              <div className="flex items-center border border-border rounded-md">
                <button type="button" onClick={() => onDecrease(tier.id)} disabled={selectedQuantity === 0} aria-label={`Remove one ${tier.name} ticket`} className="p-2 text-foreground-secondary hover:text-foreground disabled:opacity-40">
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-display text-sm text-foreground">
                  {selectedQuantity}
                </span>
                <button type="button" onClick={() => onIncrease(tier.id)} disabled={soldOut || atLimit} aria-label={`Add one ${tier.name} ticket`} className="p-2 text-foreground-secondary hover:text-foreground disabled:opacity-40">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
