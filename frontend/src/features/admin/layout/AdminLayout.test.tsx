import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminLayout from "./AdminLayout";

const mocks = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock("@/features/auth/useAuth", () => ({ useAuth: mocks.useAuth }));

beforeEach(() => {
  mocks.useAuth.mockReturnValue({
    user: { fullName: "Admin User", role: "admin" },
    logout: vi.fn(),
    isLoggingOut: false,
  });
});

describe("AdminLayout navigation", () => {
  it("groups operational navigation and preserves active-page semantics", () => {
    render(
      <MemoryRouter initialEntries={["/admin/orders"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="orders" element={<p>Orders content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Event Operations")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Orders & payments" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Guest check-in" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "People & artists" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Orders & payments" })[0]).toHaveAttribute("aria-current", "page");
  });

  it("opens the grouped mobile menu with an accessible relationship", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />} />
        </Routes>
      </MemoryRouter>,
    );

    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    expect(toggle).toHaveAttribute("aria-controls", "admin-mobile-navigation");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByText("Site").length).toBeGreaterThanOrEqual(2);
  });
});
