import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OrderSummaryCard from "./OrderSummaryCard";
import type { TicketTier } from "@/types/models";

const availableTier: TicketTier = {
  id: "tier-1",
  slug: "general-admission",
  eventId: "event-1",
  status: "published",
  name: "General admission",
  price: 1250,
  currency: "KES",
  perks: [],
  available: 4,
  availabilityState: "AVAILABLE",
  allocatedQuantity: 10,
  remainingQuantity: 4,
  maxPerOrder: 3,
  displayOrder: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("OrderSummaryCard", () => {
  it("shows API-provided currency and clamps the subtotal to the valid quantity", () => {
    render(
      <OrderSummaryCard
        tiers={[availableTier]}
        quantities={{ [availableTier.id]: 20 }}
        phoneNumber="0712345678"
      />,
    );

    expect(screen.getByText("General admission × 3")).toBeInTheDocument();
    expect(screen.getAllByText("KES 3,750")).toHaveLength(2);
    expect(screen.getByText("M-Pesa number: 0712345678")).toBeInTheDocument();
    expect(screen.queryByText(/KES 20,000/)).not.toBeInTheDocument();
  });

  it("does not summarize unavailable, zero, or negative selections", () => {
    const unavailableTier = { ...availableTier, availabilityState: "SOLD_OUT" as const };

    render(
      <OrderSummaryCard
        tiers={[unavailableTier]}
        quantities={{ [unavailableTier.id]: -2 }}
        phoneNumber=""
      />,
    );

    expect(screen.getByText("Select an available ticket to see your order summary.")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("General admission")).not.toBeInTheDocument();
  });
});
