import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Contact from "./Contact";

const usePublicSiteSettingsQuery = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/queries/usePublicSiteSettingsQuery", () => ({ usePublicSiteSettingsQuery }));
vi.mock("@/components/ScrollReveal", () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

beforeEach(() => usePublicSiteSettingsQuery.mockReturnValue({ data: undefined }));

describe("Contact page", () => {
  it("exposes the official email, telephone, and WhatsApp channels", () => {
    render(<Contact />);

    const links = screen.getAllByRole("link");
    expect(links.find((link) => link.getAttribute("href") === "mailto:theartgaloreintl@gmail.com")).toBeInTheDocument();
    expect(links.find((link) => link.getAttribute("href") === "tel:+254759292496")).toBeInTheDocument();
    expect(links.find((link) => link.getAttribute("href") === "https://wa.me/254759292496")).toBeInTheDocument();
    expect(links.find((link) => link.getAttribute("href") === "https://wa.me/254700533716")).toBeInTheDocument();
    expect(links.find((link) => link.getAttribute("href") === "https://wa.me/254758732652")).toBeInTheDocument();
  });
});
