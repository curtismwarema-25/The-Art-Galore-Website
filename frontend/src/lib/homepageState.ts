import type { TicketTier } from "@/types/models";

export function hasActiveTicketTier(tiers: TicketTier[], now = Date.now()) {
  return tiers.some((tier) =>
    tier.status === "published" &&
    tier.available > 0 &&
    (!tier.saleStartAt || new Date(tier.saleStartAt).getTime() <= now) &&
    (!tier.saleEndAt || new Date(tier.saleEndAt).getTime() >= now),
  );
}
