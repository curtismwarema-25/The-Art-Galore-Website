import {
  EventStatus,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  PaymentVerificationStatus,
  TicketDeliveryStatus,
  TicketTierStatus,
  UserRole,
} from "@prisma/client";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { env } from "../../config/index.js";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { TicketsRepository } from "../tickets/tickets.repository.js";
import { TicketsService } from "../tickets/tickets.service.js";
import { PaymentsRepository } from "./payments.repository.js";
import { PaymentsService } from "./payments.service.js";

type Fixture = {
  eventId: string;
  tierId: string;
  buyerId: string;
  orderId: string;
  orderNumber: string;
  publicToken: string;
};

class FakeTicketEmailService {
  readonly sends: string[] = [];

  async sendTicketDeliveryEmail(order: { id: string }) {
    this.sends.push(order.id);
    return { status: "sent" as const, messageId: `test-message-${order.id}` };
  }
}

function withWorkflowEnv() {
  const original = {
    EMAIL_DELIVERY_ENABLED: env.EMAIL_DELIVERY_ENABLED,
    MPESA_CONSUMER_KEY: env.MPESA_CONSUMER_KEY,
    MPESA_CONSUMER_SECRET: env.MPESA_CONSUMER_SECRET,
    MPESA_SHORTCODE: env.MPESA_SHORTCODE,
    MPESA_PASSKEY: env.MPESA_PASSKEY,
    MPESA_CALLBACK_URL: env.MPESA_CALLBACK_URL,
    MPESA_LATE_PAYMENT_POLICY: env.MPESA_LATE_PAYMENT_POLICY,
    MPESA_CALLBACK_SECRET: env.MPESA_CALLBACK_SECRET,
  };

  env.EMAIL_DELIVERY_ENABLED = true;
  env.MPESA_CONSUMER_KEY = "test-consumer-key";
  env.MPESA_CONSUMER_SECRET = "test-consumer-secret";
  env.MPESA_SHORTCODE = "174379";
  env.MPESA_PASSKEY = "test-passkey";
  env.MPESA_CALLBACK_URL = "https://example.test/api/payments/mpesa/stk/callback";
  env.MPESA_LATE_PAYMENT_POLICY = "reject";

  return () => {
    Object.assign(env, original);
  };
}

function createPaymentsService(fakeEmailService = new FakeTicketEmailService()) {
  const ticketsService = new TicketsService(new TicketsRepository(), fakeEmailService as never);
  return {
    paymentsService: new PaymentsService(new PaymentsRepository(), ticketsService),
    fakeEmailService,
  };
}

function mockDarajaQuery(result: { ResultCode: string; ResultDesc: string; CheckoutRequestID: string; MpesaReceiptNumber?: string; Amount?: number; PhoneNumber?: string }) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/oauth/v1/generate")) {
      return new Response(JSON.stringify({ access_token: "test-access-token", expires_in: "3599" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.includes("/mpesa/stkpushquery/v1/query")) {
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ errorMessage: `Unexpected URL: ${url}` }), { status: 500 });
  }) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

async function ensureDbAvailable(t: test.TestContext) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    t.skip(`Database unavailable for workflow test: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function createFixture(status: OrderStatus, options?: { expired?: boolean; quantity?: number; expiredMinutes?: number }): Promise<Fixture> {
  const suffix = randomUUID();
  const now = new Date();
  const event = await prisma.event.create({
    data: {
      slug: `workflow-event-${suffix}`,
      title: `Workflow Event ${suffix}`,
      eventType: "test",
      summary: "Workflow integration test event",
      description: "Workflow integration test event description",
      startAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 26 * 60 * 60 * 1000),
      timezone: "Africa/Nairobi",
      venueName: "Test Venue",
      capacity: 50,
      status: EventStatus.PUBLISHED,
    },
  });

  const tier = await prisma.ticketTier.create({
    data: {
      eventId: event.id,
      slug: `workflow-tier-${suffix}`,
      name: `Workflow Tier ${suffix.slice(0, 8)}`,
      price: 1000,
      currency: "KES",
      availableQuantity: 50,
      maxPerOrder: 10,
      status: TicketTierStatus.ACTIVE,
    },
  });

  const buyer = await prisma.buyerProfile.create({
    data: {
      fullName: "Workflow Buyer",
      phone: "254700000000",
      email: `buyer-${suffix}@example.test`,
    },
  });

  const quantity = options?.quantity ?? 2;
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-WF-${suffix.slice(0, 12)}`,
      publicToken: `wf-token-${suffix}`,
      eventId: event.id,
      buyerId: buyer.id,
      buyerName: buyer.fullName,
      buyerPhone: buyer.phone,
      buyerEmail: buyer.email,
      status,
      currency: "KES",
      subtotalAmount: quantity * 1000,
      totalAmount: quantity * 1000,
      reservationExpiresAt: options?.expired ? new Date(now.getTime() - (options.expiredMinutes ?? 10) * 60 * 1000) : new Date(now.getTime() + 15 * 60 * 1000),
      expiredAt: status === OrderStatus.EXPIRED ? new Date(now.getTime() - 5 * 60 * 1000) : undefined,
      items: {
        create: {
          ticketTierId: tier.id,
          quantity,
          unitPrice: 1000,
          lineTotal: quantity * 1000,
        },
      },
    },
  });

  return {
    eventId: event.id,
    tierId: tier.id,
    buyerId: buyer.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    publicToken: order.publicToken,
  };
}

async function cleanupFixture(fixture?: Fixture, reviewerId?: string) {
  if (!fixture) return;

  await prisma.order.deleteMany({ where: { id: fixture.orderId } });
  await prisma.ticketTier.deleteMany({ where: { id: fixture.tierId } });
  await prisma.event.deleteMany({ where: { id: fixture.eventId } });
  await prisma.buyerProfile.deleteMany({ where: { id: fixture.buyerId } });

  if (reviewerId) {
    await prisma.authUser.deleteMany({ where: { id: reviewerId } });
  }
}

async function createPendingMpesaTransaction(fixture: Fixture, overrides: Record<string, unknown> = {}) {
  return prisma.paymentTransaction.create({
    data: {
      orderId: fixture.orderId,
      provider: PaymentProvider.MPESA,
      status: PaymentStatus.PENDING,
      amount: 2000,
      currency: "KES",
      externalRequestId: `checkout-${randomUUID()}`,
      providerReference: `merchant-${randomUUID()}`,
      providerAccountKey: env.MPESA_SHORTCODE,
      payerPhone: "254700000000",
      ...overrides,
    },
  });
}

test("manual payment approval pays order, issues tickets once, and records delivery", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  const restoreEnv = withWorkflowEnv();
  let fixture: Fixture | undefined;
  let reviewerId: string | undefined;

  try {
    fixture = await createFixture(OrderStatus.PAYMENT_SUBMITTED);
    const reviewer = await prisma.authUser.create({
      data: {
        email: `reviewer-${randomUUID()}@example.test`,
        passwordHash: "test-password-hash",
        fullName: "Workflow Reviewer",
        role: UserRole.ADMIN,
      },
    });
    reviewerId = reviewer.id;

    const submission = await prisma.paymentProofSubmission.create({
      data: {
        orderId: fixture.orderId,
        paymentMethod: PaymentProvider.MPESA,
        payerName: "Workflow Buyer",
        phoneNumber: "254700000000",
        amountPaid: 2000,
        transactionReference: `MANUAL-${randomUUID()}`,
        verificationStatus: PaymentVerificationStatus.PENDING,
      },
    });
    await prisma.paymentTransaction.create({
      data: {
        orderId: fixture.orderId,
        provider: PaymentProvider.MPESA,
        status: PaymentStatus.PENDING,
        amount: 2000,
        currency: "KES",
        providerReference: submission.transactionReference,
      },
    });

    const { paymentsService, fakeEmailService } = createPaymentsService();
    const result = await paymentsService.approveManualPaymentSubmission(submission.id, reviewer.id, {
      verificationNote: "Approved in workflow test",
    });

    assert.equal(result.ticketsIssued, 2);
    assert.equal(result.ticketDeliveryStatus, "sent");
    assert.equal(fakeEmailService.sends.length, 1);

    await assert.rejects(
      () => paymentsService.approveManualPaymentSubmission(submission.id, reviewer.id, {}),
      /already.*reviewed/i,
    );

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: fixture.orderId },
      include: { tickets: true, ticketEmailDeliveryAttempts: true },
    });
    assert.equal(order.status, OrderStatus.PAID);
    assert.equal(order.ticketDeliveryStatus, TicketDeliveryStatus.SENT);
    assert.equal(order.tickets.length, 2);
    assert.equal(order.ticketEmailDeliveryAttempts.length, 1);
  } finally {
    restoreEnv();
    await cleanupFixture(fixture, reviewerId);
  }
});

test("M-Pesa reverify pays an active order idempotently", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  const restoreEnv = withWorkflowEnv();
  let restoreFetch: (() => void) | undefined;
  let fixture: Fixture | undefined;

  try {
    fixture = await createFixture(OrderStatus.PENDING_PAYMENT);
    const checkoutRequestId = `checkout-${randomUUID()}`;
    const transaction = await prisma.paymentTransaction.create({
      data: {
        orderId: fixture.orderId,
        provider: PaymentProvider.MPESA,
        status: PaymentStatus.PENDING,
        amount: 2000,
        currency: "KES",
        externalRequestId: checkoutRequestId,
        providerReference: `merchant-${randomUUID()}`,
      },
    });
    restoreFetch = mockDarajaQuery({
      CheckoutRequestID: checkoutRequestId,
      ResultCode: "0",
      ResultDesc: "The service request is processed successfully.",
      MpesaReceiptNumber: `RCP-${randomUUID()}`,
      Amount: 2000,
      PhoneNumber: "254700000000",
    });

    const { paymentsService, fakeEmailService } = createPaymentsService();
    const first = await paymentsService.reverifyMpesaTransaction(transaction.id);
    const second = await paymentsService.reverifyMpesaTransaction(transaction.id);

    assert.equal(first.status, "paid");
    assert.equal(first.ticketsIssued, 2);
    assert.equal(second.status, "paid");
    assert.equal(fakeEmailService.sends.length, 1);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: fixture.orderId }, include: { tickets: true } });
    assert.equal(order.status, OrderStatus.PAID);
    assert.equal(order.tickets.length, 2);
  } finally {
    restoreFetch?.();
    restoreEnv();
    await cleanupFixture(fixture);
  }
});

test("late M-Pesa success after grace requires review and issues no tickets", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  const restoreEnv = withWorkflowEnv();
  let restoreFetch: (() => void) | undefined;
  let fixture: Fixture | undefined;

  try {
    fixture = await createFixture(OrderStatus.EXPIRED, { expired: true });
    const checkoutRequestId = `checkout-${randomUUID()}`;
    const transaction = await prisma.paymentTransaction.create({
      data: {
        orderId: fixture.orderId,
        provider: PaymentProvider.MPESA,
        status: PaymentStatus.PENDING,
        amount: 2000,
        currency: "KES",
        externalRequestId: checkoutRequestId,
        providerReference: `merchant-${randomUUID()}`,
      },
    });
    restoreFetch = mockDarajaQuery({
      CheckoutRequestID: checkoutRequestId,
      ResultCode: "0",
      ResultDesc: "The service request is processed successfully.",
      MpesaReceiptNumber: `RCP-${randomUUID()}`,
      Amount: 2000,
      PhoneNumber: "254700000000",
    });

    const { paymentsService } = createPaymentsService();
    const result = await paymentsService.reverifyMpesaTransaction(transaction.id);

    assert.equal(result.status, "ambiguous");
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: fixture.orderId },
      include: { tickets: true, paymentTransactions: true },
    });
    assert.equal(order.status, OrderStatus.PAYMENT_SUBMITTED);
    assert.equal(order.tickets.length, 0);
    assert.equal(order.paymentTransactions[0]?.status, PaymentStatus.AMBIGUOUS);
  } finally {
    restoreFetch?.();
    restoreEnv();
    await cleanupFixture(fixture);
  }
});

test("M-Pesa callback route rejects missing or invalid callback secret", async () => {
  const originalNodeEnv = env.NODE_ENV;
  const restoreEnv = withWorkflowEnv();
  env.NODE_ENV = "production";
  env.MPESA_CALLBACK_SECRET = "";

  const app = createApp();
  const server = http.createServer(app);

  try {
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    assert.equal(typeof address, "object");
    assert.ok(address);
    const baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`;
    const callbackPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: "merchant",
          CheckoutRequestID: "checkout",
          ResultCode: 1,
          ResultDesc: "Failed",
        },
      },
    };

    const missingConfiguration = await fetch(`${baseUrl}/api/payments/mpesa/stk/callback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(callbackPayload),
    });

    env.MPESA_CALLBACK_SECRET = `secret-${randomUUID()}`;
    const missingSecret = await fetch(`${baseUrl}/api/payments/mpesa/stk/callback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(callbackPayload),
    });
    const invalidSecret = await fetch(`${baseUrl}/api/payments/mpesa/stk/callback`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-mpesa-callback-secret": "wrong" },
      body: JSON.stringify(callbackPayload),
    });

    assert.equal(missingConfiguration.status, 401);
    assert.equal(missingSecret.status, 401);
    assert.equal(invalidSecret.status, 401);
  } finally {
    restoreEnv();
    env.NODE_ENV = originalNodeEnv;
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("M-Pesa callback ingestion is durable and idempotent", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  const restoreEnv = withWorkflowEnv();
  const checkoutRequestId = `checkout-${randomUUID()}`;
  const payload = {
    Body: {
      stkCallback: {
        MerchantRequestID: `merchant-${randomUUID()}`,
        CheckoutRequestID: checkoutRequestId,
        ResultCode: 1032,
        ResultDesc: "Request cancelled by user",
      },
    },
  };

  try {
    const { paymentsService } = createPaymentsService();
    await paymentsService.ingestMpesaStkCallback(payload);
    await paymentsService.ingestMpesaStkCallback(payload);

    const events = await prisma.paymentCallbackInbox.findMany({ where: { checkoutRequestId } });
    assert.equal(events.length, 1);
    assert.equal(events[0]?.status, "RECEIVED");
    assert.equal(events[0]?.attemptCount, 0);
  } finally {
    restoreEnv();
    await prisma.paymentCallbackInbox.deleteMany({ where: { checkoutRequestId } });
  }
});

test("callback is persisted before the HTTP 200 response", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  const restoreEnv = withWorkflowEnv();
  env.MPESA_CALLBACK_SECRET = `secret-${randomUUID()}`;
  const checkoutRequestId = `checkout-${randomUUID()}`;
  const payload = { Body: { stkCallback: { MerchantRequestID: `merchant-${randomUUID()}`, CheckoutRequestID: checkoutRequestId, ResultCode: 1032, ResultDesc: "Cancelled" } } };
  const server = http.createServer(createApp());

  try {
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/api/payments/mpesa/stk/callback`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-mpesa-callback-secret": env.MPESA_CALLBACK_SECRET },
      body: JSON.stringify(payload),
    });
    assert.equal(response.status, 200);
    const inbox = await prisma.paymentCallbackInbox.findFirst({ where: { checkoutRequestId } });
    assert.ok(inbox);
    assert.equal(inbox.status, "RECEIVED");
  } finally {
    await prisma.paymentCallbackInbox.deleteMany({ where: { checkoutRequestId } });
    restoreEnv();
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("callback inbox claims are exclusive and expired leases are recoverable", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  const repository = new PaymentsRepository();
  const eventKey = `event-${randomUUID()}`;
  const event = await repository.createCallbackInboxEvent({
    provider: PaymentProvider.MPESA,
    providerAccountKey: "174379",
    eventKey,
    payloadHash: randomUUID(),
    checkoutRequestId: `checkout-${randomUUID()}`,
    payload: { source: "mission-03" },
    correlationId: randomUUID(),
  });
  assert.ok(event);
    const now = new Date(Date.now() + 1000);
  try {
    const claims = await Promise.all([
      repository.claimNextCallbackInboxEvent("worker-a", now, new Date(now.getTime() + 60_000)),
      repository.claimNextCallbackInboxEvent("worker-b", now, new Date(now.getTime() + 60_000)),
    ]);
    assert.equal(claims.filter(Boolean).length, 1);
    const beforeExpiry = await repository.claimNextCallbackInboxEvent("worker-c", now, new Date(now.getTime() + 60_000));
    assert.equal(beforeExpiry, null);
    const afterExpiry = await repository.claimNextCallbackInboxEvent("worker-c", new Date(now.getTime() + 61_000), new Date(now.getTime() + 121_000));
    assert.ok(afterExpiry);
    assert.equal(afterExpiry?.lockedBy, "worker-c");
  } finally {
    await prisma.paymentCallbackInbox.delete({ where: { id: event.id } });
  }
});

test("callback processing failure is durably retryable with backoff", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  const restoreEnv = withWorkflowEnv();
  const checkoutRequestId = `checkout-${randomUUID()}`;
  const payload = { Body: { stkCallback: { CheckoutRequestID: checkoutRequestId, ResultCode: 9999, ResultDesc: "Unknown" } } };
  const { paymentsService } = createPaymentsService();
  const event = await paymentsService.ingestMpesaStkCallback(payload);
  const repository = new PaymentsRepository();
  const claimed = await repository.claimNextCallbackInboxEvent("worker-retry", new Date(Date.now() + 1000), new Date(Date.now() + 61_000));
  assert.ok(claimed);
  const restoreFetch = mockDarajaQuery({ CheckoutRequestID: checkoutRequestId, ResultCode: "9999", ResultDesc: "Unknown" });
  try {
    await assert.rejects(() => paymentsService.processCallbackInboxEvent(claimed!.id));
    const retry = await prisma.paymentCallbackInbox.findUniqueOrThrow({ where: { id: claimed!.id } });
    assert.equal(retry.status, "RETRYABLE_FAILED");
    assert.equal(retry.attemptCount, 1);
    assert.ok(retry.nextAttemptAt > new Date());
  } finally {
    restoreFetch();
    restoreEnv();
    await prisma.paymentCallbackInbox.deleteMany({ where: { checkoutRequestId } });
  }
  assert.equal(event.accepted, true);
});

test("STK Query unknown and definitive failure statuses are classified separately", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  const restoreEnv = withWorkflowEnv();
  let fixture: Fixture | undefined;
  let restoreFetch: (() => void) | undefined;
  try {
    fixture = await createFixture(OrderStatus.PENDING_PAYMENT);
    const ambiguousTx = await createPendingMpesaTransaction(fixture);
    restoreFetch = mockDarajaQuery({ CheckoutRequestID: ambiguousTx.externalRequestId!, ResultCode: "9999", ResultDesc: "Unknown" });
    const { paymentsService } = createPaymentsService();
    const ambiguous = await paymentsService.reverifyMpesaTransaction(ambiguousTx.id);
    assert.equal(ambiguous.status, "ambiguous");
    assert.equal((await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: ambiguousTx.id } })).status, PaymentStatus.AMBIGUOUS);

    restoreFetch();
    const failedTx = await createPendingMpesaTransaction(fixture);
    restoreFetch = mockDarajaQuery({ CheckoutRequestID: failedTx.externalRequestId!, ResultCode: "2001", ResultDesc: "Insufficient funds" });
    const failed = await paymentsService.reverifyMpesaTransaction(failedTx.id);
    assert.equal(failed.status, "failed");
    assert.equal((await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: failedTx.id } })).status, PaymentStatus.FAILED);
  } finally {
    restoreFetch?.();
    restoreEnv();
    await cleanupFixture(fixture);
  }
});

test("provider evidence mismatches are recoverable and cannot issue tickets", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  const restoreEnv = withWorkflowEnv();
  let fixture: Fixture | undefined;
  let restoreFetch: (() => void) | undefined;
  try {
    fixture = await createFixture(OrderStatus.PENDING_PAYMENT);
    const cases = [
      { name: "amount", amount: 1999, PhoneNumber: "254700000000" },
      { name: "phone", amount: 2000, PhoneNumber: "254711111111" },
    ];
    for (const item of cases) {
      const transaction = await createPendingMpesaTransaction(fixture);
      restoreFetch = mockDarajaQuery({ CheckoutRequestID: transaction.externalRequestId!, ResultCode: "0", ResultDesc: "Success", MpesaReceiptNumber: `RCP-${randomUUID()}`, Amount: item.amount, PhoneNumber: item.PhoneNumber });
      const { paymentsService } = createPaymentsService();
      const result = await paymentsService.reverifyMpesaTransaction(transaction.id);
      assert.equal(result.status, "ambiguous", item.name);
      restoreFetch();
      restoreFetch = undefined;
    }

    const merchantTransaction = await createPendingMpesaTransaction(fixture);
    const service = createPaymentsService().paymentsService as unknown as { applyMpesaPaymentResult: (input: Record<string, unknown>) => Promise<{ status?: string }> };
    const merchantResult = await service.applyMpesaPaymentResult({
      checkoutRequestId: merchantTransaction.externalRequestId,
      merchantRequestId: "wrong-merchant",
      providerAccountKey: env.MPESA_SHORTCODE,
      resultCode: "0",
      resultDesc: "Success",
      providerReceipt: `RCP-${randomUUID()}`,
      amount: 2000,
      payerPhone: "254700000000",
      rawCallback: { source: "mission-03" },
    });
    assert.equal(merchantResult.status, "ambiguous");
    const accountTransaction = await createPendingMpesaTransaction(fixture);
    const accountResult = await service.applyMpesaPaymentResult({
      checkoutRequestId: accountTransaction.externalRequestId,
      merchantRequestId: accountTransaction.providerReference,
      providerAccountKey: "different-shortcode",
      resultCode: "0",
      resultDesc: "Success",
      providerReceipt: `RCP-${randomUUID()}`,
      amount: 2000,
      payerPhone: "254700000000",
      rawCallback: { source: "mission-03" },
    });
    assert.equal(accountResult.status, "ambiguous");
    const order = await prisma.order.findUniqueOrThrow({ where: { id: fixture.orderId }, include: { tickets: true } });
    assert.equal(order.tickets.length, 0);
  } finally {
    restoreFetch?.();
    restoreEnv();
    await cleanupFixture(fixture);
  }
});

test("confirmed payment survives fulfillment failure and later retry is idempotent", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  const restoreEnv = withWorkflowEnv();
  let fixture: Fixture | undefined;
  try {
    fixture = await createFixture(OrderStatus.PENDING_PAYMENT);
    const transaction = await createPendingMpesaTransaction(fixture);
    const failingService = new PaymentsService(new PaymentsRepository(), { issueTicketsForOrder: async () => { throw new Error("simulated fulfillment crash"); } } as never);
    const apply = failingService as unknown as { applyMpesaPaymentResult: (input: Record<string, unknown>) => Promise<{ status?: string; verifiedOrderId?: string }> };
    const confirmed = await apply.applyMpesaPaymentResult({
      checkoutRequestId: transaction.externalRequestId,
      merchantRequestId: transaction.providerReference,
      providerAccountKey: env.MPESA_SHORTCODE,
      resultCode: "0",
      resultDesc: "Success",
      providerReceipt: `RCP-${randomUUID()}`,
      amount: 2000,
      payerPhone: "254700000000",
      rawCallback: { source: "mission-03" },
    });
    assert.equal(confirmed.status, "paid");
    assert.ok(confirmed.verifiedOrderId);
    await assert.rejects(() => failingService.fulfillVerifiedOrder(fixture!.orderId), /simulated fulfillment crash/);

    let order = await prisma.order.findUniqueOrThrow({ where: { id: fixture.orderId }, include: { tickets: true, paymentTransactions: true } });
    assert.equal(order.paymentTransactions[0]?.status, PaymentStatus.SUCCEEDED);
    assert.equal(order.status, OrderStatus.PAYMENT_VERIFIED);
    assert.equal(order.tickets.length, 0);

    const fakeEmail = new FakeTicketEmailService();
    const recoveringService = createPaymentsService(fakeEmail).paymentsService;
    const firstRetry = await recoveringService.fulfillVerifiedOrder(fixture.orderId);
    const secondRetry = await recoveringService.fulfillVerifiedOrder(fixture.orderId);
    assert.equal(firstRetry.ticketsIssued, 2);
    assert.equal(secondRetry.ticketsIssued, 2);
    order = await prisma.order.findUniqueOrThrow({ where: { id: fixture.orderId }, include: { tickets: true, paymentTransactions: true } });
    assert.equal(order.status, OrderStatus.PAID);
    assert.equal(order.tickets.length, 2);
    assert.deepEqual(order.tickets.map((ticket) => ticket.sequenceNumber).sort(), [1, 2]);
  } finally {
    restoreEnv();
    await cleanupFixture(fixture);
  }
});

test("a late valid payment within grace recovers and fulfills", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  const restoreEnv = withWorkflowEnv();
  let fixture: Fixture | undefined;
  let restoreFetch: (() => void) | undefined;
  try {
    fixture = await createFixture(OrderStatus.EXPIRED, { expired: true, expiredMinutes: 1 });
    const transaction = await createPendingMpesaTransaction(fixture);
    restoreFetch = mockDarajaQuery({ CheckoutRequestID: transaction.externalRequestId!, ResultCode: "0", ResultDesc: "Success", MpesaReceiptNumber: `RCP-${randomUUID()}`, Amount: 2000, PhoneNumber: "254700000000" });
    const result = await createPaymentsService().paymentsService.reverifyMpesaTransaction(transaction.id);
    assert.equal(result.status, "paid");
    const order = await prisma.order.findUniqueOrThrow({ where: { id: fixture.orderId }, include: { tickets: true } });
    assert.equal(order.status, OrderStatus.PAID);
    assert.equal(order.tickets.length, 2);
  } finally {
    restoreFetch?.();
    restoreEnv();
    await cleanupFixture(fixture);
  }
});

test("terminal payment status cannot be overwritten by a late duplicate result", async (t) => {
  if (!(await ensureDbAvailable(t))) return;
  const restoreEnv = withWorkflowEnv();
  let fixture: Fixture | undefined;
  try {
    fixture = await createFixture(OrderStatus.PENDING_PAYMENT);
    const transaction = await createPendingMpesaTransaction(fixture, { status: PaymentStatus.SUCCEEDED, resultCode: "0", resultMessage: "Already paid", completedAt: new Date() });
    const apply = createPaymentsService().paymentsService as unknown as { applyMpesaPaymentResult: (input: Record<string, unknown>) => Promise<{ status?: string }> };
    const result = await apply.applyMpesaPaymentResult({ checkoutRequestId: transaction.externalRequestId, resultCode: "2001", resultDesc: "Late failure", rawCallback: { source: "mission-03" } });
    assert.equal(result.status, "paid");
    assert.equal((await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: transaction.id } })).status, PaymentStatus.SUCCEEDED);
  } finally {
    restoreEnv();
    await cleanupFixture(fixture);
  }
});
