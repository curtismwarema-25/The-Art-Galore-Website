import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminSettingsPage from "./AdminSettingsPage";
import type { SiteSettings } from "@/types/models";

const mocks = vi.hoisted(() => ({
  useAdminSiteSettingsQuery: vi.fn(),
  useAdminEventsQuery: vi.fn(),
  useAuth: vi.fn(),
  updateSettings: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/queries/useAdminSiteSettingsQuery", () => ({
  useAdminSiteSettingsQuery: mocks.useAdminSiteSettingsQuery,
}));

vi.mock("@/hooks/queries/useAdminEventsQuery", () => ({
  useAdminEventsQuery: mocks.useAdminEventsQuery,
}));

vi.mock("@/features/auth/useAuth", () => ({ useAuth: mocks.useAuth }));

vi.mock("@/hooks/mutations/useUpdateSiteSettingsMutation", () => ({
  useUpdateSiteSettingsMutation: () => ({ isPending: false, mutateAsync: mocks.updateSettings }),
}));

vi.mock("@/hooks/mutations/useUploadMediaMutation", () => ({
  useUploadMediaMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

const settings: SiteSettings = {
  id: "settings-1",
  slug: "default",
  status: "published",
  displayOrder: 1,
  siteName: "The Art Galore International",
  tagline: "A Free Space to Connect Us All",
  footerText: "The Art Galore International creates art experiences.",
  contactEmail: "hello@example.com",
  contactPhone: "+254 700 000 000",
  whatsappLink: "",
  instagram: "https://instagram.com/art-galore",
  tiktok: "https://tiktok.com/@art-galore",
  x: "",
  facebook: "",
  heroTitle: "A Free Space to Connect Us All",
  heroSubtitle: "Immersive events and shared creativity.",
  featuredEventId: "",
  defaultMetaTitle: "Art Galore International",
  defaultMetaDescription: "Discover art events and community experiences.",
  defaultSocialPreviewImage: "/bg.jpg",
  privacyPolicyLink: "/privacy-policy",
  termsLink: "/terms-of-use",
  refundPolicyLink: "/ticket-refund-policy",
  aboutTitle: "About Art Galore",
  aboutIntro: "A space for creativity and community.",
  aboutBody: "Art Galore brings people together through creative experiences.",
  contactTitle: "Let's connect.",
  contactIntro: "Contact us about events, tickets, and collaborations.",
  privacyPolicyContent: "Privacy policy content that is long enough for validation.",
  termsContent: "Terms and conditions content that is long enough for validation.",
  refundPolicyContent: "Refund policy content that is long enough for validation.",
  manualPaymentEnabled: true,
  mpesaComingSoonMessage: "Automated M-Pesa checkout coming soon",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useAuth.mockReturnValue({ hasRole: () => true });
  mocks.useAdminEventsQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
  mocks.updateSettings.mockResolvedValue(settings);
});

describe("AdminSettingsPage", () => {
  it("shows loading only while the settings request is loading", () => {
    mocks.useAdminSiteSettingsQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    render(<AdminSettingsPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading site settings");
  });

  it("renders the settings form after valid settings load", async () => {
    mocks.useAdminSiteSettingsQuery.mockReturnValue({ data: settings, isLoading: false, isError: false });

    render(<AdminSettingsPage />);

    expect(await screen.findByText("Public legal page content")).toBeInTheDocument();
    expect(screen.getByDisplayValue(settings.privacyPolicyContent)).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Site settings sections" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Legal" })).toHaveAttribute("href", "#settings-legal");
  });

  it("shows an actionable error when settings loading fails", () => {
    mocks.useAdminSiteSettingsQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    render(<AdminSettingsPage />);

    expect(screen.getByRole("heading", { name: "Site settings could not be loaded" })).toBeInTheDocument();
    expect(screen.getByText(/Refresh the page or check your connection/)).toBeInTheDocument();
    expect(screen.queryByText("Loading site settings")).not.toBeInTheDocument();
  });

  it("does not render a form for incomplete settings data", () => {
    mocks.useAdminSiteSettingsQuery.mockReturnValue({ data: { id: settings.id }, isLoading: false, isError: false });

    render(<AdminSettingsPage />);

    expect(screen.getByRole("heading", { name: "Site settings are unavailable" })).toBeInTheDocument();
    expect(screen.queryByText("Public legal page content")).not.toBeInTheDocument();
  });

  it("reports a save failure without losing the loaded form", async () => {
    mocks.useAdminSiteSettingsQuery.mockReturnValue({ data: settings, isLoading: false, isError: false });
    mocks.updateSettings.mockRejectedValue(new Error("Settings API failed"));

    render(<AdminSettingsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Settings API failed"));
    expect(screen.getByText("Public legal page content")).toBeInTheDocument();
  });
});
