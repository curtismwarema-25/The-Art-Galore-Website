import { CalendarDays, Clock3, Minus, Plus } from "lucide-react";
import { getTicketPurchaseLimit, type TicketAvailabilityState, type TicketTier } from "@/types/models";

type TicketTierSelectorProps = {
  tiers: TicketTier[];
  quantities: Record<string, number>;
  timezone?: string;
  onIncrease: (tierId: string) => void;
  onDecrease: (tierId: string) => void;
};

const availabilityLabel: Record<TicketAvailabilityState, string> = {
  HIDDEN: "Unavailable",
  CANCELLED: "Event cancelled",
  SALES_CLOSED: "Sales closed",
  UPCOMING: "Sales opening soon",
  SOLD_OUT: "Sold out",
  AVAILABLE: "Available now",
};

const availabilityClassName: Record<TicketAvailabilityState, string> = {
  HIDDEN: "border-border bg-secondary/20 text-foreground-secondary",
  CANCELLED: "border-destructive/35 bg-destructive/5 text-destructive",
  SALES_CLOSED: "border-border bg-secondary/20 text-foreground-secondary",
  UPCOMING: "border-accent/35 bg-accent/5 text-accent",
  SOLD_OUT: "border-destructive/35 bg-destructive/5 text-destructive",
  AVAILABLE: "border-accent/35 bg-accent/5 text-accent",
};

function formatSaleDate(value: string | undefined, timezone: string) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

function getAvailabilityState(tier: TicketTier): TicketAvailabilityState {
  return tier.availabilityState ?? "HIDDEN";
}

export default function TicketTierSelector({
  tiers,
  quantities,
  timezone = "Africa/Nairobi",
  onIncrease,
  onDecrease,
}: TicketTierSelectorProps) {
  return (
    <div className="space-y-3">
      {tiers.map((tier) => {
        const state = getAvailabilityState(tier);
        const purchaseLimit = getTicketPurchaseLimit(tier);
        const selectedQuantity = Math.min(Math.max(quantities[tier.id] ?? 0, 0), purchaseLimit);
        const isAvailable = state === "AVAILABLE";
        const atLimit = selectedQuantity >= purchaseLimit;
        const saleStart = formatSaleDate(tier.saleStartAt, timezone);
        const saleEnd = formatSaleDate(tier.saleEndAt, timezone);

        return (
          <article
            key={tier.id}
            className={`rounded-[var(--radius-md)] border p-4 transition-[border-color,background-color] duration-200 ${
              selectedQuantity > 0 && isAvailable
                ? "border-accent bg-accent/5"
                : "border-border bg-background"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-display text-base text-foreground">{tier.name}</h4>
                {tier.description && <p className="mt-1 text-xs leading-relaxed text-foreground-secondary">{tier.description}</p>}
                {tier.perks.length > 0 && <p className="mt-2 text-xs text-foreground-secondary">{tier.perks.join(" | ")}</p>}
              </div>
              <p className="shrink-0 font-display text-base text-foreground">
                {tier.currency} {tier.price.toLocaleString()}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-[var(--radius-sm)] border px-2 py-1 text-[10px] font-display uppercase tracking-[0.14em] ${availabilityClassName[state]}`}>
                {availabilityLabel[state]}
              </span>
              {state === "AVAILABLE" && (
                <span className="text-xs text-foreground-secondary">
                  {tier.remainingQuantity ?? 0} remaining
                </span>
              )}
              {tier.maxPerOrder && (
                <span className="text-xs text-foreground-secondary">
                  Max {tier.maxPerOrder} per order
                </span>
              )}
            </div>

            {(saleStart || saleEnd) && (
              <div className="mt-3 space-y-1 text-xs text-foreground-secondary">
                {saleStart && (
                  <p className="flex items-center gap-2">
                    <CalendarDays size={13} className="shrink-0 text-accent" />
                    Sales open {saleStart}
                  </p>
                )}
                {saleEnd && (
                  <p className="flex items-center gap-2">
                    <Clock3 size={13} className="shrink-0 text-accent" />
                    Sales close {saleEnd}
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className={`text-xs ${isAvailable ? "text-accent" : "text-foreground-secondary"}`}>
                {state === "AVAILABLE"
                  ? selectedQuantity > 0 && atLimit
                    ? "Order limit reached"
                    : "Choose quantity"
                  : availabilityLabel[state]}
              </p>
              <div className="flex items-center rounded-[var(--radius-sm)] border border-border">
                <button
                  type="button"
                  onClick={() => onDecrease(tier.id)}
                  disabled={selectedQuantity === 0}
                  aria-label={`Remove one ${tier.name} ticket`}
                  className="p-2 text-foreground-secondary transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-display text-sm text-foreground" aria-live="polite">
                  {selectedQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => onIncrease(tier.id)}
                  disabled={!isAvailable || atLimit}
                  aria-label={`Add one ${tier.name} ticket`}
                  className="p-2 text-foreground-secondary transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
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
