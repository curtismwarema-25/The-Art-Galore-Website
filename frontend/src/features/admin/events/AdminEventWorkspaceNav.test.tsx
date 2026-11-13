import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AdminEventWorkspaceNav from "./AdminEventWorkspaceNav";
import type { EventRecord } from "@/types/models";

const event = {
  id: "event-1",
  slug: "art-galore",
  status: "published",
  title: "Art Galore International",
  type: "Exhibition",
  phase: "upcoming",
  lifecycle: "upcoming",
  summary: "A public exhibition.",
  description: "Exhibition details.",
  date: "2026-09-01",
  time: "12:00 PM - 4:00 PM",
  startAt: "2026-09-01T09:00:00.000Z",
  endAt: "2026-09-01T13:00:00.000Z",
  timezone: "Africa/Nairobi",
  venue: "Kisii Cultural Centre",
  capacity: 100,
  heroImage: "/event.jpg",
  supportedBy: [],
  highlights: [],
  lineup: [],
  displayOrder: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} satisfies EventRecord;

describe("AdminEventWorkspaceNav", () => {
  it("shows event context, available inventory summary, and workspace sections", () => {
    render(
      <MemoryRouter initialEntries={["/admin/events/event-1"]}>
        <AdminEventWorkspaceNav
          event={event}
          currentSection="overview"
          ticketSummary={{ tierCount: 2, allocatedQuantity: 50, remainingQuantity: 18 }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: event.title })).toBeInTheDocument();
    expect(screen.getByText(/2 ticket tiers · 50 allocated · 18 remaining/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Tickets" })).toHaveAttribute("href", "/admin/events/event-1/tickets");
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("href", "/admin/orders?eventId=event-1");
    expect(screen.getByRole("link", { name: "Guests" })).toHaveAttribute("href", "/admin/checkin?eventId=event-1");
  });
});
