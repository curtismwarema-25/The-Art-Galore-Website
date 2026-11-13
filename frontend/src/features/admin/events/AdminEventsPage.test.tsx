import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminEventsPage from "./AdminEventsPage";
import { eventFormSchema } from "./eventForm";
import type { TicketAvailabilityState, TicketTier } from "@/types/models";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useAdminEventsQuery: vi.fn(),
  useAdminEventQuery: vi.fn(),
  useAdminTicketTiersQuery: vi.fn(),
  useAuth: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  uploadMedia: vi.fn(),
  createTier: vi.fn(),
  updateTier: vi.fn(),
  deleteTier: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/queries", () => ({
  useAdminEventsQuery: mocks.useAdminEventsQuery,
  useAdminEventQuery: mocks.useAdminEventQuery,
  useAdminTicketTiersQuery: mocks.useAdminTicketTiersQuery,
}));

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/hooks/mutations/useEventMutations", () => ({
  useCreateEventMutation: () => ({ isPending: false, mutateAsync: mocks.createEvent }),
  useUpdateEventMutation: () => ({ isPending: false, mutateAsync: mocks.updateEvent }),
  useDeleteEventMutation: () => ({ isPending: false, mutateAsync: mocks.deleteEvent }),
}));

vi.mock("@/hooks/mutations/useUploadMediaMutation", () => ({
  useUploadMediaMutation: () => ({ isPending: false, mutateAsync: mocks.uploadMedia }),
}));

vi.mock("@/hooks/mutations/useTicketTierMutations", () => ({
  useCreateTicketTierMutation: () => ({ isPending: false, mutateAsync: mocks.createTier }),
  useUpdateTicketTierMutation: () => ({ isPending: false, mutateAsync: mocks.updateTier }),
  useDeleteTicketTierMutation: () => ({ isPending: false, mutateAsync: mocks.deleteTier }),
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

const event = {
  id: "event-1",
  slug: "art-galore",
  status: "published" as const,
  title: "Art Galore International",
  type: "Exhibition",
  phase: "upcoming" as const,
  lifecycle: "upcoming" as const,
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
};

const baseTier: TicketTier = {
  id: "tier-1",
  slug: "general-admission",
  eventId: "event-1",
  status: "published",
  name: "General admission",
  description: "Entry",
  price: 1500,
  currency: "KES",
  perks: ["Entry"],
  available: 10,
  availabilityState: "AVAILABLE",
  allocatedQuantity: 10,
  remainingQuantity: 4,
  saleStartAt: "2026-08-01T09:00:00.000Z",
  saleEndAt: "2026-08-31T20:59:00.000Z",
  maxPerOrder: 4,
  displayOrder: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderPage(tier: TicketTier = baseTier) {
  mocks.useAdminEventsQuery.mockReturnValue({ data: [event], isLoading: false, isError: false });
  mocks.useAdminEventQuery.mockReturnValue({
    data: {
      ...event,
      ticketTiers: [tier],
      galleryImages: [],
      approvedUploads: [],
    },
    isLoading: false,
    isError: false,
  });
  mocks.useAdminTicketTiersQuery.mockReturnValue({ data: [tier], isLoading: false, isError: false });

  return render(
    <MemoryRouter initialEntries={["/admin/events/event-1"]}>
      <Routes>
        <Route path="/admin/events/:id" element={<AdminEventsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function editTier(tier: TicketTier = baseTier) {
  renderPage(tier);
  fireEvent.click(screen.getByRole("button", { name: /^Edit$/i }));
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mocks.useAuth.mockReturnValue({ hasRole: () => true });
});

describe("AdminEventsPage ticket visibility", () => {
  it("validates blank and positive capacity while rejecting zero and negative values", () => {
    const baseForm = {
      title: "New exhibition",
      type: "Exhibition",
      venue: "Kisii Cultural Centre",
      capacity: "",
      startAt: "2026-09-01T12:00",
      endAt: "2026-09-01T16:00",
      lifecycle: "draft" as const,
      summary: "",
      timezone: "Africa/Nairobi",
    };

    expect(eventFormSchema.safeParse(baseForm).success).toBe(true);
    expect(eventFormSchema.safeParse({ ...baseForm, capacity: "120" }).success).toBe(true);
    expect(eventFormSchema.safeParse({ ...baseForm, capacity: "0" }).success).toBe(false);
    expect(eventFormSchema.safeParse({ ...baseForm, capacity: "-1" }).success).toBe(false);
  });

  it("allows creating an event without an optional capacity value", async () => {
    mocks.createEvent.mockResolvedValueOnce(event);
    renderPage();

    const createButton = screen.getByRole("button", { name: "Create event" });
    const createForm = createButton.closest("form");
    expect(createForm).not.toBeNull();
    if (!createForm) return;

    fireEvent.change(within(createForm).getByPlaceholderText("Event title"), { target: { value: "New exhibition" } });
    fireEvent.change(within(createForm).getByLabelText("Event start date and time"), { target: { value: "2026-09-01T12:00" } });
    fireEvent.change(within(createForm).getByLabelText("Event end date and time"), { target: { value: "2026-09-01T16:00" } });
    fireEvent.change(within(createForm).getByPlaceholderText("Venue"), { target: { value: "Kisii Cultural Centre" } });
    fireEvent.submit(createForm);

    await waitFor(() => expect(mocks.createEvent).toHaveBeenCalledWith(expect.objectContaining({ capacity: undefined })));
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it.each([
    ["AVAILABLE", "Available"],
    ["UPCOMING", "Upcoming"],
    ["SOLD_OUT", "Sold out"],
    ["SALES_CLOSED", "Sales closed"],
    ["HIDDEN", "Hidden"],
    ["CANCELLED", "Cancelled"],
  ] as const)("shows the backend-derived %s state", (state, label) => {
    renderPage({ ...baseTier, availabilityState: state as TicketAvailabilityState });

    expect(screen.getByText(label, { selector: "span" })).toBeInTheDocument();
  });

  it("separates allocated inventory from remaining inventory and configuration status", () => {
    renderPage();

    expect(screen.getByText("Allocated:").parentElement).toHaveTextContent("10");
    expect(screen.getByText("Remaining:").parentElement).toHaveTextContent("4");
    expect(screen.getAllByText("Published", { selector: "span" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Available", { selector: "span" })).toBeInTheDocument();
    expect(screen.queryByText(/Sold:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Reserved:/i)).not.toBeInTheDocument();
  });

  it("shows the configured sale window in the event timezone", () => {
    renderPage();

    expect(screen.getByText(/Opens 1 Aug 2026, 12:00/)).toBeInTheDocument();
    expect(screen.getByText(/Closes 31 Aug 2026, 23:59/)).toBeInTheDocument();
  });

  it("preserves event edits until explicitly discarded", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();

    const eventTitle = screen.getAllByPlaceholderText("Event title")[1];
    fireEvent.change(eventTitle, { target: { value: "Edited event title" } });
    expect(eventTitle).toHaveValue("Edited event title");

    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(confirm).toHaveBeenCalled();
    expect(eventTitle).toHaveValue(event.title);
  });

  it("guards switching to another event while an edit is dirty", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage();

    fireEvent.change(screen.getAllByPlaceholderText("Event title")[1], { target: { value: "Edited event title" } });
    fireEvent.click(screen.getAllByRole("link", { name: "Manage event" })[0]);

    expect(confirm).toHaveBeenCalledWith("You have unsaved changes. Leave this page and discard them?");
    expect(mocks.navigate).not.toHaveBeenCalledWith("/admin/events/event-1");
  });

  it("presents a mobile event summary with status and direct actions", () => {
    renderPage();

    expect(screen.getAllByText("When").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Venue").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Manage event" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /View public page/ })).toHaveLength(3);
  });

  it("clears event dirty state after a successful save", async () => {
    mocks.updateEvent.mockResolvedValueOnce(event);
    renderPage();

    const eventTitle = screen.getAllByPlaceholderText("Event title")[1];
    fireEvent.change(eventTitle, { target: { value: "Edited event title" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mocks.updateEvent).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Discard changes" })).not.toBeInTheDocument();
  });

  it("preserves event edits after an API failure", async () => {
    mocks.updateEvent.mockRejectedValueOnce(new Error("Event API failed"));
    renderPage();

    const eventTitle = screen.getAllByPlaceholderText("Event title")[1];
    fireEvent.change(eventTitle, { target: { value: "Edited event title" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Event API failed"));
    expect(eventTitle).toHaveValue("Edited event title");
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeInTheDocument();
  });

  it("uses allocated quantity when opening an existing tier for editing", () => {
    editTier();

    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
  });

  it("does not submit an unchanged tier", () => {
    editTier();

    fireEvent.click(screen.getByRole("button", { name: /Update Tier/i }));

    expect(mocks.updateTier).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith("No ticket tier changes to save.");
  });

  it("shows an allocation increase and preserves the existing save flow", async () => {
    mocks.updateTier.mockResolvedValueOnce({ ...baseTier, allocatedQuantity: 12 });
    editTier();

    fireEvent.change(screen.getByPlaceholderText("Available tickets"), { target: { value: "12" } });
    expect(screen.getByText("Allocated quantity:").parentElement).toHaveTextContent("10 → 12");
    expect(screen.queryByText(/may affect existing orders/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Update Tier/i }));

    await waitFor(() => expect(mocks.updateTier).toHaveBeenCalledWith(expect.objectContaining({
      id: "tier-1",
      input: expect.objectContaining({ available: 12 }),
    })));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Ticket tier updated.");
    expect(screen.queryByRole("button", { name: /Cancel edit/i })).not.toBeInTheDocument();
  });

  it("warns and allows cancelling an allocation reduction", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    editTier();

    fireEvent.change(screen.getByPlaceholderText("Available tickets"), { target: { value: "8" } });

    expect(screen.getByRole("alert")).toHaveTextContent("may affect existing orders and reservations");
    fireEvent.click(screen.getByRole("button", { name: /Update Tier/i }));

    expect(confirm).toHaveBeenCalled();
    expect(mocks.updateTier).not.toHaveBeenCalled();
  });

  it("flags reductions below the currently inferred committed quantity without calling it sold", () => {
    editTier();

    fireEvent.change(screen.getByPlaceholderText("Available tickets"), { target: { value: "5" } });

    const alerts = screen.getAllByRole("alert");
    expect(alerts.some((alert) => alert.textContent?.includes("below the 6 quantity"))).toBe(true);
    expect(alerts.some((alert) => alert.textContent?.includes("does not separate sold and reserved quantities"))).toBe(true);
    expect(screen.queryByText(/entirely sold/i)).not.toBeInTheDocument();
  });

  it.each([
    ["price", () => fireEvent.change(screen.getByPlaceholderText("Price"), { target: { value: "1750" } }), "Price changes affect future orders"],
    ["sale window", () => fireEvent.change(screen.getByLabelText("Ticket sales start date and time"), { target: { value: "2026-08-02T12:00" } }), "Sale-window changes affect future availability"],
    ["maximum per order", () => fireEvent.change(screen.getByPlaceholderText(/Maximum tickets per order/i), { target: { value: "2" } }), "Maximum-per-order changes affect future checkout validation"],
  ] as const)("warns before saving a %s change", (_name, change, warning) => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    editTier();

    change();

    expect(screen.getByRole("alert")).toHaveTextContent(warning);
    fireEvent.click(screen.getByRole("button", { name: /Update Tier/i }));
    expect(confirm).toHaveBeenCalled();
    expect(mocks.updateTier).not.toHaveBeenCalled();
  });

  it.each([
    ["publishing", { ...baseTier, status: "draft" as const }, "published", "Publishing makes this tier eligible"],
    ["archiving", baseTier, "archived", "Archiving hides this tier from new public sales"],
  ] as const)("warns before %s a tier", (_name, tier, status, warning) => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    editTier(tier);

    fireEvent.change(screen.getByLabelText("Ticket tier status"), { target: { value: status } });

    expect(screen.getByRole("alert")).toHaveTextContent(warning);
    fireEvent.click(screen.getByRole("button", { name: /Update Tier/i }));
    expect(confirm).toHaveBeenCalled();
    expect(mocks.updateTier).not.toHaveBeenCalled();
  });

  it("shows API failures without clearing the edit state", async () => {
    mocks.updateTier.mockRejectedValueOnce(new Error("Ticket tier API failed"));
    editTier();

    fireEvent.change(screen.getByPlaceholderText("Tier name"), { target: { value: "Updated admission" } });
    fireEvent.click(screen.getByRole("button", { name: /Update Tier/i }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Ticket tier API failed"));
    expect(screen.getByRole("button", { name: /Discard changes/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tier name")).toHaveValue("Updated admission");
  });
});
