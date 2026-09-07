import { describe, expect, it } from "vitest";
import { hasActiveTicketTier } from "@/lib/homepageState";
import type { TicketTier } from "@/types/models";

const baseTier: TicketTier = {
  id: "tier-1",
  eventId: "event-1",
  name: "General admission",
  description: "Entry",
  price: 1000,
  currency: "KES",
  available: 10,
  status: "published",
  saleStartAt: null,
  saleEndAt: null,
  displayOrder: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("homepage ticketed event state", () => {
  it("recognizes a published tier that is currently on sale", () => {
    expect(hasActiveTicketTier([baseTier], Date.parse("2026-09-07T00:00:00.000Z"))).toBe(true);
  });

  it("does not promote sold-out, draft, or out-of-window tiers", () => {
    expect(hasActiveTicketTier([{ ...baseTier, available: 0 }])).toBe(false);
    expect(hasActiveTicketTier([{ ...baseTier, status: "draft" }])).toBe(false);
    expect(hasActiveTicketTier([{ ...baseTier, saleStartAt: "2026-09-08T00:00:00.000Z" }], Date.parse("2026-09-07T00:00:00.000Z"))).toBe(false);
    expect(hasActiveTicketTier([{ ...baseTier, saleEndAt: "2026-09-06T00:00:00.000Z" }], Date.parse("2026-09-07T00:00:00.000Z"))).toBe(false);
  });
});
