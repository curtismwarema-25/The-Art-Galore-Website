import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "./Navbar";

const mocks = vi.hoisted(() => ({
  useEventsQuery: vi.fn(),
  useEventQuery: vi.fn(),
}));

vi.mock("@/hooks/queries/useEventsQuery", () => ({ useEventsQuery: mocks.useEventsQuery }));
vi.mock("@/hooks/queries/useEventQuery", () => ({ useEventQuery: mocks.useEventQuery }));

beforeEach(() => {
  mocks.useEventsQuery.mockReturnValue({ data: [], isLoading: false });
  mocks.useEventQuery.mockReturnValue({ data: undefined, isLoading: false });
});

describe("public navigation", () => {
  it("focuses public navigation on home, events, and ticket purchase", () => {
    mocks.useEventsQuery.mockReturnValue({ data: [{ slug: "sip-and-paint-edition-iv", lifecycle: "upcoming" }], isLoading: false });
    mocks.useEventQuery.mockReturnValue({
      data: { ticketTiers: [{ availabilityState: "AVAILABLE", remainingQuantity: 12, maxPerOrder: 4 }] },
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={["/artists"]}>
        <Navbar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Events" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get Tickets" })).toHaveAttribute("href", "/events/sip-and-paint-edition-iv");
    expect(screen.queryByRole("link", { name: "Artists" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Gallery" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Partners" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Community" })).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "public-mobile-navigation");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("link", { name: "Get Tickets" }).length).toBeGreaterThan(0);
  });
});
