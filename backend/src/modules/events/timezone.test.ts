import assert from "node:assert/strict";
import test from "node:test";
import { EventStatus, TicketTierStatus } from "@prisma/client";
import { ValidationError } from "../../common/errors/httpErrors.js";
import { EventsService } from "./events.service.js";
import {
  adminCreateEventSchema,
  adminUpdateEventSchema,
} from "./events.schema.js";
import {
  DEFAULT_EVENT_TIMEZONE,
  getEffectiveEventTimezone,
  validateConfiguredEventTimezone,
} from "./timezone.js";
import { deriveTicketAvailability } from "./ticketAvailability.js";

const eventInput = {
  title: "Timezone Test Event",
  type: "Exhibition",
  venue: "Art Galore Gallery",
  startAt: "2027-01-01T10:00:00.000Z",
  endAt: "2027-01-01T14:00:00.000Z",
};

function legacyEvent(timezone?: string) {
  return {
    id: "event-1",
    slug: "timezone-test-event",
    title: "Timezone Test Event",
    eventType: "Exhibition",
    summary: "A test event",
    description: "A test event description",
    startAt: new Date("2027-01-01T10:00:00.000Z"),
    endAt: new Date("2027-01-01T14:00:00.000Z"),
    timezone,
    venueName: "Art Galore Gallery",
    capacity: 100,
    status: EventStatus.PUBLISHED,
    heroImageUrl: null,
    heroStorageKey: null,
    heroMimeType: null,
    heroSizeBytes: null,
    heroWidth: null,
    heroHeight: null,
    displayOrder: 0,
    createdAt: new Date("2026-12-01T00:00:00.000Z"),
    updatedAt: new Date("2026-12-01T00:00:00.000Z"),
    highlights: [],
    lineupItems: [],
    partnerPlacements: [],
    ticketTiers: [],
    galleryImages: [],
    communityUploads: [],
  };
}

function serviceFor(event: ReturnType<typeof legacyEvent>) {
  return new EventsService({
    getPublicEventBySlug: async () => event,
    getAdminEventById: async () => event,
    getReservedTicketQuantities: async () => new Map<string, number>(),
  } as never);
}

test("accepts valid IANA timezone identifiers", () => {
  const parsed = adminCreateEventSchema.parse({
    body: { ...eventInput, timezone: "America/New_York" },
  });

  assert.equal(parsed.body.timezone, "America/New_York");
  assert.equal(validateConfiguredEventTimezone(" Africa/Nairobi "), "Africa/Nairobi");
});

test("rejects invalid timezone identifiers during creation and updates", () => {
  const createResult = adminCreateEventSchema.safeParse({
    body: { ...eventInput, timezone: "Not/A_Timezone" },
  });
  const updateResult = adminUpdateEventSchema.safeParse({
    params: { id: "event-1" },
    body: { timezone: "Not/A_Timezone" },
  });

  assert.equal(createResult.success, false);
  assert.equal(updateResult.success, false);
  if (!createResult.success) {
    assert.match(createResult.error.issues[0]?.message ?? "", /valid IANA timezone/);
  }
});

test("uses the Nairobi fallback only when configuration is missing", () => {
  assert.equal(validateConfiguredEventTimezone(), DEFAULT_EVENT_TIMEZONE);
  assert.equal(getEffectiveEventTimezone(undefined), DEFAULT_EVENT_TIMEZONE);
  assert.equal(getEffectiveEventTimezone("legacy-invalid-value"), DEFAULT_EVENT_TIMEZONE);
  assert.throws(
    () => validateConfiguredEventTimezone("legacy-invalid-value"),
    (error: unknown) => error instanceof ValidationError && /valid IANA timezone/.test(error.message),
  );
});

test("service-level create and update validation rejects explicit invalid input", async () => {
  const service = new EventsService({} as never);

  await assert.rejects(
    () => service.createAdminEvent({ ...eventInput, startAt: new Date(eventInput.startAt), endAt: new Date(eventInput.endAt), timezone: "Not/A_Timezone" }),
    (error: unknown) => error instanceof ValidationError,
  );
  await assert.rejects(
    () => service.updateAdminEvent("event-1", { timezone: "Not/A_Timezone" }),
    (error: unknown) => error instanceof ValidationError,
  );
});

test("creation persists the established fallback when timezone is omitted", async () => {
  let capturedTimezone: string | undefined;
  const event = legacyEvent();
  const service = new EventsService({
    findEventBySlug: async () => null,
    createEvent: async (data: { timezone: string }) => {
      capturedTimezone = data.timezone;
      return event.id;
    },
    getAdminEventById: async () => event,
    getReservedTicketQuantities: async () => new Map<string, number>(),
  } as never);

  await service.createAdminEvent({
    ...eventInput,
    startAt: new Date(eventInput.startAt),
    endAt: new Date(eventInput.endAt),
  });

  assert.equal(capturedTimezone, DEFAULT_EVENT_TIMEZONE);
});

test("public serialization falls back safely for an invalid legacy timezone", async () => {
  const event = legacyEvent("Legacy/Invalid");
  const serialized = await serviceFor(event).getPublicEventBySlug(event.slug);

  assert.equal(serialized.timezone, DEFAULT_EVENT_TIMEZONE);
  assert.equal(serialized.startAt, event.startAt.toISOString());
  assert.equal(serialized.endAt, event.endAt.toISOString());
  assert.match(serialized.time, /-/);
});

test("admin serialization falls back safely for an invalid legacy timezone", async () => {
  const event = legacyEvent("Legacy/Invalid");
  const serialized = await serviceFor(event).getAdminEventById(event.id);

  assert.equal(serialized.timezone, DEFAULT_EVENT_TIMEZONE);
  assert.equal(serialized.startAt, event.startAt.toISOString());
  assert.equal(serialized.endAt, event.endAt.toISOString());
});

test("missing legacy timezone uses the same fallback for public and admin serialization", async () => {
  const event = legacyEvent(undefined);
  const service = serviceFor(event);

  const [publicEvent, adminEvent] = await Promise.all([
    service.getPublicEventBySlug(event.slug),
    service.getAdminEventById(event.id),
  ]);

  assert.equal(publicEvent.timezone, DEFAULT_EVENT_TIMEZONE);
  assert.equal(adminEvent.timezone, DEFAULT_EVENT_TIMEZONE);
  assert.equal(publicEvent.time, adminEvent.time);
});

test("timezone serialization leaves availability comparisons based on stored instants", () => {
  const now = new Date("2027-01-01T13:00:00.000Z");
  const eventEndAt = new Date("2027-01-01T14:00:00.000Z");

  const availability = deriveTicketAvailability({
    eventStatus: EventStatus.PUBLISHED,
    eventEndAt,
    tierStatus: TicketTierStatus.ACTIVE,
    allocatedQuantity: 10,
    reservedQuantity: 0,
    now,
  });

  assert.equal(availability.availabilityState, "AVAILABLE");
  assert.equal(eventEndAt.toISOString(), "2027-01-01T14:00:00.000Z");
});
