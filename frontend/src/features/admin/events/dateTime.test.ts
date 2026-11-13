import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_EVENT_TIMEZONE,
  getSafeEventTimezone,
  toEventDateTimeInput,
  toEventIsoString,
} from "./dateTime";

describe("admin event timezone conversion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("round-trips Africa/Nairobi without using the browser timezone", () => {
    const iso = "2026-09-01T09:00:00.000Z";
    const input = toEventDateTimeInput(iso, "Africa/Nairobi");

    expect(input).toBe("2026-09-01T12:00");
    expect(toEventIsoString(input, "Africa/Nairobi")).toBe(iso);
  });

  it("is unchanged when the browser timezone differs from the event timezone", () => {
    vi.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(600);

    expect(toEventDateTimeInput("2026-09-01T09:00:00.000Z", "Africa/Nairobi")).toBe("2026-09-01T12:00");
    expect(toEventIsoString("2026-09-01T12:00", "Africa/Nairobi")).toBe("2026-09-01T09:00:00.000Z");
  });

  it("uses Africa/Nairobi when the timezone is missing or invalid", () => {
    const iso = "2026-09-01T09:00:00.000Z";

    expect(getSafeEventTimezone()).toBe(DEFAULT_EVENT_TIMEZONE);
    expect(getSafeEventTimezone("Not/AZone")).toBe(DEFAULT_EVENT_TIMEZONE);
    expect(toEventDateTimeInput(iso, "Not/AZone")).toBe("2026-09-01T12:00");
    expect(toEventIsoString("2026-09-01T12:00", "Not/AZone")).toBe(iso);
  });

  it("round-trips a timezone with daylight-saving transitions", () => {
    const iso = "2026-07-01T16:00:00.000Z";
    const input = toEventDateTimeInput(iso, "America/New_York");

    expect(input).toBe("2026-07-01T12:00");
    expect(toEventIsoString(input, "America/New_York")).toBe(iso);
  });

  it("rejects nonexistent and ambiguous daylight-saving times", () => {
    expect(() => toEventIsoString("2026-03-08T02:30", "America/New_York")).toThrow("does not exist");
    expect(() => toEventIsoString("2026-11-01T01:30", "America/New_York")).toThrow("ambiguous");
  });
});
