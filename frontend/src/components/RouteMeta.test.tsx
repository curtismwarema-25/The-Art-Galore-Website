import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import RouteMeta from "./RouteMeta";

describe("legal route metadata", () => {
  it.each([
    ["/privacy", "Privacy Policy | The Art Galore International"],
    ["/terms", "Terms of Use | The Art Galore International"],
    ["/refund-policy", "Ticket Refund Policy | The Art Galore International"],
  ])("assigns legal metadata for %s", async (path, title) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <RouteMeta />
      </MemoryRouter>,
    );

    await waitFor(() => expect(document.title).toBe(title));
  });
});
