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
  it("exposes the public sections while keeping ticket purchase prominent", () => {
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
    expect(screen.getByRole("link", { name: "Artists" })).toHaveAttribute("href", "/artists");
    expect(screen.getByRole("link", { name: "Gallery" })).toHaveAttribute("href", "/gallery");
    expect(screen.getByRole("link", { name: "Community" })).toHaveAttribute("href", "/share");
    expect(screen.getByRole("link", { name: "Partners" })).toHaveAttribute("href", "/partners");
    expect(screen.getByRole("link", { name: "Get Tickets" })).toHaveAttribute("href", "/events/sip-and-paint-edition-iv");

    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "public-mobile-navigation");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("link", { name: "Get Tickets" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Artists" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Gallery" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Community" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Partners" }).length).toBeGreaterThan(0);
  });
});
