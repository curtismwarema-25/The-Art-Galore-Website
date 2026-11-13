import { describe, expect, it } from "vitest";
import { buildAdminEventFilterOptions } from "./adminEventFilter";

describe("buildAdminEventFilterOptions", () => {
  it("uses the admin event records, including unpublished events", () => {
    expect(buildAdminEventFilterOptions([
      { id: "draft-event", title: "Draft exhibition" },
      { id: "cancelled-event", title: "Cancelled exhibition" },
    ])).toEqual([
      { label: "All Events", value: "all" },
      { label: "Draft exhibition", value: "draft-event" },
      { label: "Cancelled exhibition", value: "cancelled-event" },
    ]);
  });
});
