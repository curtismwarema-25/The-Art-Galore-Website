import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUnsavedChangesGuard } from "./useUnsavedChangesGuard";

function GuardedLink() {
  useUnsavedChangesGuard(true);
  return (
    <Link to="/admin/events/other">
      Other event
    </Link>
  );
}

describe("useUnsavedChangesGuard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks an in-app link when discard is declined", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MemoryRouter><GuardedLink /></MemoryRouter>);

    const link = screen.getByRole("link", { name: "Other event" });
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("allows navigation after discard is confirmed", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<MemoryRouter><GuardedLink /></MemoryRouter>);

    fireEvent.click(screen.getByRole("link", { name: "Other event" }));

    expect(window.confirm).toHaveBeenCalledWith("You have unsaved changes. Leave this page and discard them?");
  });
});
