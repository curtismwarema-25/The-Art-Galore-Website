import type { EventRecord } from "@/types/models";

export function buildAdminEventFilterOptions(events: Pick<EventRecord, "id" | "title">[]) {
  return [{ label: "All Events", value: "all" }, ...events.map((event) => ({ label: event.title, value: event.id }))];
}
