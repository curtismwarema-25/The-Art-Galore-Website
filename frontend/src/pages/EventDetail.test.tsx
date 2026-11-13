import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, beforeEach, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import EventDetail from "./EventDetail";
import type { TicketTier } from "@/types/models";

const mocks = vi.hoisted(() => ({
  useEventQuery: vi.fn(),
  useCreateOrderMutation: vi.fn(),
  useUploadMediaMutation: vi.fn(),
  useSubmitCommunityUploadMutation: vi.fn(),
  createOrder: vi.fn(),
  navigate: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/hooks/queries/useEventQuery", () => ({
  useEventQuery: mocks.useEventQuery,
}));

vi.mock("@/hooks/mutations/useCreateOrderMutation", () => ({
  useCreateOrderMutation: mocks.useCreateOrderMutation,
}));

vi.mock("@/hooks/mutations/useUploadMediaMutation", () => ({
  useUploadMediaMutation: mocks.useUploadMediaMutation,
}));

vi.mock("@/hooks/mutations/useUploadMutations", () => ({
  useSubmitCommunityUploadMutation: mocks.useSubmitCommunityUploadMutation,
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useParams: () => ({ slug: "event-1" }),
  };
});

const availableTier: TicketTier = {
  id: "tier-available",
  slug: "general-admission",
  eventId: "event-1",
  status: "published",
  name: "General admission",
  description: "Entry",
  price: 1500,
  currency: "KES",
  perks: [],
  available: 2,
  availabilityState: "AVAILABLE",
  allocatedQuantity: 10,
  remainingQuantity: 2,
  maxPerOrder: 2,
  displayOrder: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const baseEvent = {
  id: "event-1",
  slug: "event-1",
  status: "published" as const,
  title: "Art Galore Exhibition",
  type: "Exhibition",
  phase: "upcoming" as const,
  lifecycle: "upcoming" as const,
  summary: "A public exhibition.",
  description: "Exhibition details.",
  date: "1 September 2026",
  time: "12:00 PM",
  startAt: "2026-09-01T09:00:00.000Z",
  endAt: "2026-09-01T16:00:00.000Z",
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
  ticketTiers: [availableTier],
  galleryImages: [],
  approvedUploads: [],
};

type TestEvent = Omit<typeof baseEvent, "lifecycle" | "ticketTiers"> & {
  lifecycle: "upcoming" | "cancelled";
  ticketTiers: TicketTier[];
};

function setEvent(event: TestEvent = baseEvent) {
  mocks.useEventQuery.mockReturnValue({ data: event, isLoading: false, isError: false });
}

function renderEvent(event: TestEvent = baseEvent) {
  setEvent(event);
  return render(
    <MemoryRouter>
      <EventDetail />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useCreateOrderMutation.mockReturnValue({ isPending: false, mutateAsync: mocks.createOrder });
  mocks.useUploadMediaMutation.mockReturnValue({ isPending: false, mutateAsync: vi.fn() });
  mocks.useSubmitCommunityUploadMutation.mockReturnValue({ isPending: false, mutateAsync: vi.fn() });
  mocks.createOrder.mockResolvedValue({
    idempotentReplay: false,
    order: { orderNumber: "ORD-1", publicToken: "public-token" },
  });
  setEvent();
});

describe("EventDetail public ticket checkout", () => {
  it("shows checkout for a valid available selection and submits the clamped item", async () => {
    renderEvent();

    const payButton = await screen.findByRole("button", { name: /Pay KES 1,500 with M-Pesa/i });
    expect(payButton).toBeEnabled();

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "Test Buyer" } });
    fireEvent.change(screen.getByLabelText(/M-Pesa Phone Number/i), { target: { value: "0712345678" } });
    fireEvent.change(screen.getByLabelText(/Email for Tickets/i), { target: { value: "buyer@example.com" } });
    fireEvent.click(payButton);

    await waitFor(() => expect(mocks.createOrder).toHaveBeenCalledTimes(1));
    expect(mocks.createOrder.mock.calls[0][0].input).toEqual(expect.objectContaining({
      eventId: "event-1",
      items: [{ ticketTierId: "tier-available", quantity: 1 }],
    }));
  });

  it.each([
    ["UPCOMING", "Sales opening soon", "upcoming"],
    ["SOLD_OUT", "Sold out", "upcoming"],
    ["SALES_CLOSED", "Sales closed", "upcoming"],
    ["CANCELLED", "Event cancelled", "cancelled"],
    ["HIDDEN", "Unavailable", "upcoming"],
  ] as const)("does not offer checkout for %s tickets", async (availabilityState, label, lifecycle) => {
    const unavailableTier = {
      ...availableTier,
      availabilityState,
      remainingQuantity: 0,
    } satisfies TicketTier;

    renderEvent({ ...baseEvent, lifecycle, ticketTiers: [unavailableTier] });

    expect((await screen.findAllByText(label)).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("button", { name: /Pay .*with M-Pesa/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Full Name/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add one General admission ticket/i })).toBeDisabled();
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("keeps checkout available when an event mixes purchasable and unavailable tiers", async () => {
    const upcomingTier = {
      ...availableTier,
      id: "tier-upcoming",
      name: "Early access",
      availabilityState: "UPCOMING" as const,
      remainingQuantity: 20,
      saleStartAt: "2026-09-02T00:00:00.000Z",
    };

    renderEvent({ ...baseEvent, ticketTiers: [availableTier, upcomingTier] });

    expect(await screen.findByRole("button", { name: /Pay KES 1,500 with M-Pesa/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Add one Early access ticket/i })).toBeDisabled();
  });

  it("removes stale checkout when inventory changes after the initial selection", async () => {
    const { rerender } = renderEvent();
    expect(await screen.findByRole("button", { name: /Pay KES 1,500 with M-Pesa/i })).toBeEnabled();

    const soldOutEvent = {
      ...baseEvent,
      ticketTiers: [{ ...availableTier, availabilityState: "SOLD_OUT" as const, remainingQuantity: 0 }],
    };
    setEvent(soldOutEvent);
    rerender(
      <MemoryRouter>
        <EventDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Pay .*with M-Pesa/i })).not.toBeInTheDocument();
    });
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });
});
