import { EventStatus, TicketTierStatus } from "@prisma/client";
import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveTicketAvailability,
  getRemainingTicketQuantity,
  isTicketQuantityWithinLimit,
} from "./ticketAvailability.js";

const now = new Date("2026-11-11T12:00:00.000Z");
const eventEndAt = new Date("2026-11-11T18:00:00.000Z");

function availability(overrides: Partial<Parameters<typeof deriveTicketAvailability>[0]> = {}) {
  return deriveTicketAvailability({
    eventStatus: EventStatus.PUBLISHED,
    eventEndAt,
    tierStatus: TicketTierStatus.ACTIVE,
    allocatedQuantity: 10,
    reservedQuantity: 0,
    now,
    ...overrides,
  });
}

test("hides draft tiers", () => {
  assert.equal(availability({ tierStatus: TicketTierStatus.DRAFT }).availabilityState, "HIDDEN");
});

test("hides unpublished events", () => {
  assert.equal(availability({ eventStatus: EventStatus.DRAFT }).availabilityState, "HIDDEN");
});

test("marks cancelled events as cancelled", () => {
  assert.equal(availability({ eventStatus: EventStatus.CANCELLED }).availabilityState, "CANCELLED");
});

test("closes tiers after the configured sales deadline", () => {
  assert.equal(
    availability({ saleEndAt: new Date("2026-11-11T11:59:59.999Z") }).availabilityState,
    "SALES_CLOSED",
  );
});

test("closes tiers when the event has ended", () => {
  assert.equal(
    availability({ eventEndAt: new Date("2026-11-11T12:00:00.000Z") }).availabilityState,
    "SALES_CLOSED",
  );
});

test("keeps tiers upcoming before their opening time", () => {
  assert.equal(
    availability({ saleStartAt: new Date("2026-11-11T12:00:00.001Z") }).availabilityState,
    "UPCOMING",
  );
});

test("marks an open tier with inventory available", () => {
  assert.deepEqual(
    availability({ allocatedQuantity: 10, reservedQuantity: 3 }),
    {
      availabilityState: "AVAILABLE",
      allocatedQuantity: 10,
      remainingQuantity: 7,
    },
  );
});

test("marks an open tier sold out when inventory is exhausted", () => {
  assert.deepEqual(
    availability({ allocatedQuantity: 10, reservedQuantity: 10 }),
    {
      availabilityState: "SOLD_OUT",
      allocatedQuantity: 10,
      remainingQuantity: 0,
    },
  );
});

test("clamps reservations beyond allocation to zero remaining quantity", () => {
  assert.equal(getRemainingTicketQuantity(10, 14), 0);
});

test("uses an inclusive opening boundary", () => {
  assert.equal(
    availability({ saleStartAt: now }).availabilityState,
    "AVAILABLE",
  );
});

test("uses an inclusive configured sale-end boundary", () => {
  assert.equal(
    availability({ saleEndAt: now }).availabilityState,
    "AVAILABLE",
  );
});

test("uses an exclusive event-end boundary", () => {
  assert.equal(
    availability({ eventEndAt: now }).availabilityState,
    "SALES_CLOSED",
  );
});

test("keeps max-per-order validation aligned with order creation", () => {
  assert.equal(isTicketQuantityWithinLimit(2, 2), true);
  assert.equal(isTicketQuantityWithinLimit(3, 2), false);
  assert.equal(isTicketQuantityWithinLimit(20, null), true);
});
