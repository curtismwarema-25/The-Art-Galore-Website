import { describe, expect, it } from "vitest";
import { formatOrderDateTime } from "./orderDateTime";

describe("order date formatting", () => {
  it("formats dates in the supplied event timezone", () => {
    const formatted = formatOrderDateTime("2026-11-14T10:00:00.000Z", "Africa/Nairobi");
    expect(formatted).toContain("14 Nov 2026");
    expect(formatted).toContain("13:00");
  });

  it("falls back to Nairobi for missing or invalid legacy timezone values", () => {
    expect(formatOrderDateTime("2026-11-14T10:00:00.000Z")).toContain("13:00");
    expect(formatOrderDateTime("2026-11-14T10:00:00.000Z", "Legacy/Invalid")).toContain("13:00");
  });
});
