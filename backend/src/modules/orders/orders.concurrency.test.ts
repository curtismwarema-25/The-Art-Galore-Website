import { EventStatus, OrderStatus, TicketTierStatus } from "@prisma/client";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "../../lib/prisma.js";
import { ValidationError } from "../../common/errors/httpErrors.js";
import { OrdersService } from "./orders.service.js";

type InventoryFixture = { eventId: string; tierIds: string[] };

async function ensureDbAvailable(t: test.TestContext) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    t.skip(`Database unavailable for inventory concurrency test: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function createInventoryFixture(availableQuantity: number, secondTierQuantity?: number): Promise<InventoryFixture> {
  const suffix = randomUUID();
  const now = new Date();
  const event = await prisma.event.create({
    data: {
      slug: `inventory-event-${suffix}`,
      title: `Inventory Event ${suffix}`,
      eventType: "test",
      summary: "Inventory concurrency test",
      description: "Inventory concurrency test",
      startAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 26 * 60 * 60 * 1000),
      timezone: "Africa/Nairobi",
      venueName: "Test venue",
      capacity: 100,
      status: EventStatus.PUBLISHED,
    },
  });

  const tier = await prisma.ticketTier.create({
    data: {
      eventId: event.id,
      slug: `inventory-tier-${suffix}`,
      name: `Inventory tier ${suffix.slice(0, 8)}`,
      price: 1000,
      currency: "KES",
      availableQuantity,
      maxPerOrder: 10,
      status: TicketTierStatus.ACTIVE,
    },
  });

  const tierIds = [tier.id];
  if (secondTierQuantity !== undefined) {
    const secondTier = await prisma.ticketTier.create({
      data: {
        eventId: event.id,
        slug: `inventory-tier-2-${suffix}`,
        name: `Inventory tier 2 ${suffix.slice(0, 8)}`,
        price: 1200,
        currency: "KES",
        availableQuantity: secondTierQuantity,
        maxPerOrder: 10,
        status: TicketTierStatus.ACTIVE,
      },
    });
    tierIds.push(secondTier.id);
  }

  return { eventId: event.id, tierIds };
}

async function cleanupInventoryFixture(fixture?: InventoryFixture) {
  if (!fixture) return;
  await prisma.order.deleteMany({ where: { eventId: fixture.eventId } });
  await prisma.event.delete({ where: { id: fixture.eventId } });
}

function orderInput(eventId: string, ticketTierId: string, quantity: number) {
  return {
    eventId,
    buyer: {
      buyerName: `Concurrency buyer ${randomUUID()}`,
      buyerPhone: `2547${Math.floor(10000000 + Math.random() * 89999999)}`,
      buyerEmail: `${randomUUID()}@example.test`,
    },
    items: [{ ticketTierId, quantity }],
  };
}

async function reservedQuantity(tierId: string) {
  const result = await prisma.orderItem.aggregate({
    where: {
      ticketTierId: tierId,
      order: {
        status: {
          in: [OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_SUBMITTED, OrderStatus.PAYMENT_VERIFIED, OrderStatus.PAID],
        },
      },
    },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

test("two concurrent purchases for the final ticket reserve exactly one", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  let fixture: InventoryFixture | undefined;
  try {
    fixture = await createInventoryFixture(1);
    const service = new OrdersService();
    const results = await Promise.allSettled([
      service.createOrder(orderInput(fixture.eventId, fixture.tierIds[0], 1)),
      service.createOrder(orderInput(fixture.eventId, fixture.tierIds[0], 1)),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected").length, 1);
    assert.ok(results.find((result) => result.status === "rejected")?.reason instanceof ValidationError);
    assert.equal(await reservedQuantity(fixture.tierIds[0]), 1);
  } finally {
    await cleanupInventoryFixture(fixture);
  }
});

test("concurrent multi-ticket demand fails atomically without overselling", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  let fixture: InventoryFixture | undefined;
  try {
    fixture = await createInventoryFixture(3);
    const service = new OrdersService();
    const results = await Promise.allSettled([
      service.createOrder(orderInput(fixture.eventId, fixture.tierIds[0], 2)),
      service.createOrder(orderInput(fixture.eventId, fixture.tierIds[0], 2)),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected").length, 1);
    assert.equal(await reservedQuantity(fixture.tierIds[0]), 2);
  } finally {
    await cleanupInventoryFixture(fixture);
  }
});

test("concurrent purchases for different tiers do not interfere", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  let fixture: InventoryFixture | undefined;
  try {
    fixture = await createInventoryFixture(1, 1);
    const service = new OrdersService();
    const results = await Promise.all([
      service.createOrder(orderInput(fixture.eventId, fixture.tierIds[0], 1)),
      service.createOrder(orderInput(fixture.eventId, fixture.tierIds[1], 1)),
    ]);
    assert.equal(results.length, 2);
    assert.equal(await reservedQuantity(fixture.tierIds[0]), 1);
    assert.equal(await reservedQuantity(fixture.tierIds[1]), 1);
  } finally {
    await cleanupInventoryFixture(fixture);
  }
});

test("failed reservation does not consume inventory and idempotent retry creates one order", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  let fixture: InventoryFixture | undefined;
  try {
    fixture = await createInventoryFixture(1);
    const service = new OrdersService();
    await assert.rejects(() => service.createOrder(orderInput(fixture!.eventId, fixture!.tierIds[0], 2)), ValidationError);
    assert.equal(await reservedQuantity(fixture.tierIds[0]), 0);

    const idempotencyKey = `inventory-retry-${randomUUID()}`;
    const input = orderInput(fixture.eventId, fixture.tierIds[0], 1);
    const results = await Promise.all([
      service.createOrder(input, idempotencyKey),
      service.createOrder(input, idempotencyKey),
    ]);
    assert.equal(results[0].order.id, results[1].order.id);
    assert.equal(results.filter((result) => result.idempotentReplay).length, 1);
    assert.equal(await reservedQuantity(fixture.tierIds[0]), 1);
  } finally {
    await cleanupInventoryFixture(fixture);
  }
});

test("expired reservation release is safe under concurrent replacement purchases", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  let fixture: InventoryFixture | undefined;
  try {
    fixture = await createInventoryFixture(1);
    const service = new OrdersService();
    const initial = await service.createOrder(orderInput(fixture.eventId, fixture.tierIds[0], 1));
    await prisma.order.update({ where: { id: initial.order.id }, data: { reservationExpiresAt: new Date(Date.now() - 1000) } });

    const replacements = await Promise.allSettled([
      service.createOrder(orderInput(fixture.eventId, fixture.tierIds[0], 1)),
      service.createOrder(orderInput(fixture.eventId, fixture.tierIds[0], 1)),
    ]);
    assert.equal(replacements.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(replacements.filter((result) => result.status === "rejected").length, 1);
    const expired = await prisma.order.findUniqueOrThrow({ where: { id: initial.order.id } });
    assert.equal(expired.status, OrderStatus.EXPIRED);
    assert.equal(await reservedQuantity(fixture.tierIds[0]), 1);
  } finally {
    await cleanupInventoryFixture(fixture);
  }
});
