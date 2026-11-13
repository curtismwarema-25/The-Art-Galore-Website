import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import TicketTierSelector from "./TicketTierSelector";
import type { TicketTier } from "@/types/models";

const baseTier: TicketTier = {
  id: "tier-1",
  slug: "general-admission",
  eventId: "event-1",
  status: "published",
  name: "General admission",
  description: "Entry to the exhibition",
  price: 1500,
  currency: "KES",
  perks: ["Entry"],
  available: 4,
  availabilityState: "AVAILABLE",
  allocatedQuantity: 10,
  remainingQuantity: 4,
  maxPerOrder: 3,
  saleStartAt: null,
  saleEndAt: null,
  displayOrder: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderTier(overrides: Partial<TicketTier> = {}, quantities: Record<string, number> = {}) {
  const onIncrease = vi.fn();
  const onDecrease = vi.fn();

  render(
    <TicketTierSelector
      tiers={[{ ...baseTier, ...overrides }]}
      quantities={quantities}
      timezone="Africa/Nairobi"
      onIncrease={onIncrease}
      onDecrease={onDecrease}
    />,
  );

  return { onIncrease, onDecrease };
}

describe("TicketTierSelector availability states", () => {
  it.each([
    ["AVAILABLE", "Available now", false],
    ["UPCOMING", "Sales opening soon", true],
    ["SOLD_OUT", "Sold out", true],
    ["SALES_CLOSED", "Sales closed", true],
    ["CANCELLED", "Event cancelled", true],
    ["HIDDEN", "Unavailable", true],
  ] as const)("presents %s and controls purchase availability", (state, label, disabled) => {
    renderTier({ availabilityState: state, remainingQuantity: state === "AVAILABLE" ? 4 : 0 });

    expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    const increase = screen.getByRole("button", { name: /Add one General admission ticket/i });

    if (!disabled) {
      expect(screen.getByText("4 remaining")).toBeInTheDocument();
      expect(increase).toBeEnabled();
    } else {
      expect(increase).toBeDisabled();
    }
  });

  it("formats sale dates in the event timezone", () => {
    renderTier({ saleStartAt: "2026-09-01T00:00:00.000Z", saleEndAt: "2026-09-02T20:59:00.000Z" });

    expect(screen.getByText("Sales open 1 Sept 2026, 03:00")).toBeInTheDocument();
    expect(screen.getByText("Sales close 2 Sept 2026, 23:59")).toBeInTheDocument();
  });
});

describe("TicketTierSelector quantity limits", () => {
  it("limits quantity to the smaller of inventory and maxPerOrder", () => {
    function StatefulSelector() {
      const [quantity, setQuantity] = useState(0);

      return (
        <TicketTierSelector
          tiers={[baseTier]}
          quantities={{ [baseTier.id]: quantity }}
          onIncrease={() => setQuantity((current) => current + 1)}
          onDecrease={() => setQuantity((current) => Math.max(current - 1, 0))}
        />
      );
    }

    render(<StatefulSelector />);
    const increase = screen.getByRole("button", { name: /Add one General admission ticket/i });

    fireEvent.click(increase);
    fireEvent.click(increase);
    fireEvent.click(increase);
    fireEvent.click(increase);

    expect(screen.getByText("3", { selector: "span" })).toBeInTheDocument();
    expect(increase).toBeDisabled();
  });

  it("clamps zero, negative, over-limit, and stale quantities before display", () => {
    const { onDecrease } = renderTier({}, { [baseTier.id]: -2 });
    expect(screen.getByText("0", { selector: "span" })).toBeInTheDocument();
    expect(onDecrease).not.toHaveBeenCalled();

    cleanup();
    renderTier({}, { [baseTier.id]: 99 });
    expect(screen.getByText("3", { selector: "span" })).toBeInTheDocument();
  });

  it("clamps a quantity when remaining inventory changes", () => {
    const { rerender } = render(
      <TicketTierSelector
        tiers={[baseTier]}
        quantities={{ [baseTier.id]: 3 }}
        onIncrease={vi.fn()}
        onDecrease={vi.fn()}
      />,
    );

    rerender(
      <TicketTierSelector
        tiers={[{ ...baseTier, remainingQuantity: 1 }]}
        quantities={{ [baseTier.id]: 3 }}
        onIncrease={vi.fn()}
        onDecrease={vi.fn()}
      />,
    );

    expect(screen.getByText("1", { selector: "span" })).toBeInTheDocument();
  });
});
