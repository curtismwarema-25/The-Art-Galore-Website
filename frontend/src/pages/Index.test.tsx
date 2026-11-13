import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Index from "./Index";

const mocks = vi.hoisted(() => ({
  useEventsQuery: vi.fn(),
  useEventQuery: vi.fn(),
  usePublicSiteSettingsQuery: vi.fn(),
}));

vi.mock("@/hooks/queries/useEventsQuery", () => ({ useEventsQuery: mocks.useEventsQuery }));
vi.mock("@/hooks/queries/useEventQuery", () => ({ useEventQuery: mocks.useEventQuery }));
vi.mock("@/hooks/queries/usePublicSiteSettingsQuery", () => ({ usePublicSiteSettingsQuery: mocks.usePublicSiteSettingsQuery }));

const event = {
  id: "event-1",
  slug: "sip-and-paint-edition-iv",
  displayOrder: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  status: "published" as const,
  title: "SIP AND PAINT EDITION IV",
  type: "Sip & Paint",
  phase: "upcoming" as const,
  lifecycle: "upcoming" as const,
  summary: "An evening of painting and connection.",
  description: "Join us for a creative evening.",
  date: "14 November 2026",
  time: "1:00 PM - 5:00 PM",
  startAt: "2026-11-14T10:00:00.000Z",
  endAt: "2026-11-14T14:00:00.000Z",
  timezone: "Africa/Nairobi",
  venue: "Banana Resort",
  capacity: 100,
  heroImage: "/event.jpg",
  supportedBy: [],
  highlights: [],
  lineup: [],
  ticketTiers: [{
    id: "tier-1",
    slug: "general",
    eventId: "event-1",
    name: "General",
    price: 2500,
    currency: "KES" as const,
    perks: [],
    available: 20,
    availabilityState: "AVAILABLE" as const,
    allocatedQuantity: 20,
    remainingQuantity: 20,
    maxPerOrder: 4,
    status: "published" as const,
    displayOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }],
  galleryImages: [],
  approvedUploads: [],
};

beforeEach(() => {
  mocks.useEventsQuery.mockReturnValue({ data: [{ ...event, ticketTiers: undefined }], isLoading: false, isError: false });
  mocks.useEventQuery.mockReturnValue({ data: event, isLoading: false, isError: false });
  mocks.usePublicSiteSettingsQuery.mockReturnValue({ data: undefined });
});

describe("public ticket-sales homepage", () => {
  it("promotes the API event and links directly to its ticket page", () => {
    render(<MemoryRouter><Index /></MemoryRouter>);

    expect(screen.getByText("SIP AND PAINT EDITION IV")).toBeInTheDocument();
    expect(screen.getByText("Banana Resort")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Get Tickets/ })).toHaveAttribute("href", "/events/sip-and-paint-edition-iv");
  });

  it("shows a safe fallback without a misleading ticket CTA when event data is unavailable", () => {
    mocks.useEventsQuery.mockReturnValue({ data: [], isLoading: false, isError: true });
    mocks.useEventQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    render(<MemoryRouter><Index /></MemoryRouter>);

    expect(screen.getByText("The next gathering is being prepared.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Get Tickets/ })).not.toBeInTheDocument();
  });
});
