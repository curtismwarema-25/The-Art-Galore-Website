import { describe, expect, it } from "vitest";
import { hasActiveTicketTier } from "@/lib/homepageState";
import type { TicketTier } from "@/types/models";

const baseTier: TicketTier = {
  id: "tier-1",
  slug: "general-admission",
  eventId: "event-1",
  name: "General admission",
  description: "Entry",
  price: 1000,
  currency: "KES",
  perks: ["Entry"],
  available: 10,
  status: "published",
  availabilityState: "AVAILABLE",
  remainingQuantity: 10,
  saleStartAt: null,
  saleEndAt: null,
  displayOrder: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("homepage ticketed event state", () => {
  it("recognizes a backend-derived available tier", () => {
    expect(hasActiveTicketTier([baseTier])).toBe(true);
  });

  it("does not promote unavailable backend states or exhausted inventory", () => {
    for (const availabilityState of ["UPCOMING", "SOLD_OUT", "SALES_CLOSED", "HIDDEN", "CANCELLED"] as const) {
      expect(hasActiveTicketTier([{ ...baseTier, availabilityState }])).toBe(false);
    }
    expect(hasActiveTicketTier([{ ...baseTier, remainingQuantity: 0 }])).toBe(false);
  });

  it("does not recreate sales-window logic when the backend says a tier is available", () => {
    expect(hasActiveTicketTier([{ ...baseTier, saleStartAt: "2099-09-08T00:00:00.000Z" }])).toBe(true);
  });
});
