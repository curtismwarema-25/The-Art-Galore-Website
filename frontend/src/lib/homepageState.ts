import { getTicketPurchaseLimit, type TicketTier } from "@/types/models";

export function hasActiveTicketTier(tiers: TicketTier[]) {
  return tiers.some((tier) => getTicketPurchaseLimit(tier) > 0);
}
