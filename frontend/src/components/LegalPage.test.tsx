import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LegalPage from "./LegalPage";

const usePublicSiteSettingsQuery = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/queries/usePublicSiteSettingsQuery", () => ({ usePublicSiteSettingsQuery }));

const legalContent = {
  privacyPolicyContent: "Privacy content paragraph one.\n\nPrivacy content paragraph two.",
  termsContent: "Terms content paragraph one.\n\nTerms content paragraph two.",
  refundPolicyContent: "Refund content paragraph one.\n\nRefund content paragraph two.",
};

beforeEach(() => {
  vi.clearAllMocks();
  usePublicSiteSettingsQuery.mockReturnValue({ data: legalContent, isLoading: false, isError: false });
});

describe("LegalPage", () => {
  it("shows a loading state while the public settings request is loading", () => {
    usePublicSiteSettingsQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    render(<LegalPage title="Privacy Policy" description="Privacy details" field="privacyPolicyContent" fallback="Fallback" />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading legal information");
    expect(screen.queryByText("Fallback")).not.toBeInTheDocument();
  });

  it.each([
    ["privacyPolicyContent", "Privacy Policy", "Privacy content paragraph one."],
    ["termsContent", "Terms of Use", "Terms content paragraph one."],
    ["refundPolicyContent", "Refund Policy", "Refund content paragraph one."],
  ] as const)("renders CMS content for %s", (field, title, paragraph) => {
    render(<LegalPage title={title} description="Legal details" field={field} fallback="Fallback" />);

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByText(paragraph)).toBeInTheDocument();
    expect(screen.getByText(/working editorial content/)).toBeInTheDocument();
  });

  it("uses fallback content and communicates when the CMS field is empty", () => {
    usePublicSiteSettingsQuery.mockReturnValue({ data: { privacyPolicyContent: "   " }, isLoading: false, isError: false });
    render(<LegalPage title="Privacy Policy" description="Privacy details" field="privacyPolicyContent" fallback="Fallback policy content." />);

    expect(screen.getByText("Fallback policy content.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("fallback guidance");
  });

  it("renders CMS headings, lists, and bold labels semantically", () => {
    usePublicSiteSettingsQuery.mockReturnValue({
      data: { privacyPolicyContent: "### 1. Information\n\n- **Name:** Your name\n- Email address" },
      isLoading: false,
      isError: false,
    });
    render(<LegalPage title="Privacy Policy" description="Privacy details" field="privacyPolicyContent" fallback="Fallback" />);

    expect(screen.getByRole("heading", { name: "1. Information", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByText("Your name")).toBeInTheDocument();
    expect(screen.getByText("Name:")).toHaveProperty("tagName", "STRONG");
  });

  it("shows a non-technical error instead of fallback content when the API fails", () => {
    usePublicSiteSettingsQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<LegalPage title="Privacy Policy" description="Privacy details" field="privacyPolicyContent" fallback="Fallback policy content." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Legal information unavailable");
    expect(screen.getByRole("alert")).toHaveTextContent("Please try again later");
    expect(screen.queryByText("Fallback policy content.")).not.toBeInTheDocument();
  });
});
