import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:3306/test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";

const { env } = await import("../../config/index.js");
const { TicketEmailRetryWorker } = await import("./ticketEmailRetryWorker.js");
const { TicketsService } = await import("./tickets.service.js");

function summary(orderId = "order-1") {
  return {
    orderId,
    orderNumber: "ORD-TEST-1",
    ticketDeliveryStatus: "failed" as const,
    attemptCount: 1,
    maxAttempts: 5,
    lastAttemptAt: undefined,
    nextRetryAt: undefined,
    lastError: undefined,
    hasBuyerEmail: true,
    hasIssuedTickets: true,
    canResend: false,
    attempts: [],
  };
}

function repositorySummary(orderId = "order-1", status: "PENDING" | "FAILED" | "SENT" = "FAILED") {
  return {
    id: orderId,
    orderNumber: "ORD-TEST-1",
    ticketDeliveryStatus: status,
    ticketDeliveryAttemptCount: status === "SENT" ? 1 : 0,
    ticketDeliveryLastAttemptAt: null,
    ticketDeliveryNextRetryAt: null,
    ticketDeliveryLastError: null,
    buyerEmail: "buyer@example.test",
    tickets: [{ id: "ticket-1" }],
    ticketEmailDeliveryAttempts: [],
  };
}

function withRetryConfig<T>(callback: () => Promise<T>) {
  const previous = {
    emailEnabled: env.EMAIL_DELIVERY_ENABLED,
    retryEnabled: env.EMAIL_DELIVERY_RETRY_ENABLED,
    interval: env.EMAIL_DELIVERY_RETRY_SWEEP_INTERVAL_SECONDS,
    maxAttempts: env.EMAIL_DELIVERY_RETRY_MAX_ATTEMPTS,
    batchSize: env.EMAIL_DELIVERY_RETRY_BATCH_SIZE,
  };

  env.EMAIL_DELIVERY_ENABLED = true;
  env.EMAIL_DELIVERY_RETRY_ENABLED = true;
  env.EMAIL_DELIVERY_RETRY_SWEEP_INTERVAL_SECONDS = 60;
  env.EMAIL_DELIVERY_RETRY_MAX_ATTEMPTS = 5;
  env.EMAIL_DELIVERY_RETRY_BATCH_SIZE = 20;

  return callback().finally(() => {
    env.EMAIL_DELIVERY_ENABLED = previous.emailEnabled;
    env.EMAIL_DELIVERY_RETRY_ENABLED = previous.retryEnabled;
    env.EMAIL_DELIVERY_RETRY_SWEEP_INTERVAL_SECONDS = previous.interval;
    env.EMAIL_DELIVERY_RETRY_MAX_ATTEMPTS = previous.maxAttempts;
    env.EMAIL_DELIVERY_RETRY_BATCH_SIZE = previous.batchSize;
  });
}

test("retry worker processes only the due IDs returned by the eligibility query", async () => {
  await withRetryConfig(async () => {
    const attempted: string[] = [];
    const service = {
      listDueTicketEmailDeliveryOrderIds: async () => ["eligible-pending", "eligible-failed"],
      attemptTicketEmailDelivery: async (orderId: string, trigger: string) => {
        attempted.push(`${orderId}:${trigger}`);
      },
    };

    await new TicketEmailRetryWorker(service as never).runOnce();

    assert.deepEqual(attempted, ["eligible-pending:AUTOMATIC", "eligible-failed:AUTOMATIC"]);
  });
});

test("empty eligibility results do not process orders without tickets, email, or due retries", async () => {
  await withRetryConfig(async () => {
    let attempts = 0;
    const service = {
      listDueTicketEmailDeliveryOrderIds: async () => [],
      attemptTicketEmailDelivery: async () => { attempts += 1; },
    };

    await new TicketEmailRetryWorker(service as never).runOnce();
    assert.equal(attempts, 0);
  });
});

test("worker does not process a future retry or an order at the retry limit", async () => {
  await withRetryConfig(async () => {
    const calls: Date[] = [];
    const service = {
      listDueTicketEmailDeliveryOrderIds: async (now: Date) => { calls.push(now); return []; },
      attemptTicketEmailDelivery: async () => assert.fail("ineligible order was attempted"),
    };

    await new TicketEmailRetryWorker(service as never).runOnce();
    assert.equal(calls.length, 1);
    assert.ok(calls[0] instanceof Date);
  });
});

test("overlapping sweeps share one processing flight", async () => {
  await withRetryConfig(async () => {
    let listCalls = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const service = {
      listDueTicketEmailDeliveryOrderIds: async () => {
        listCalls += 1;
        await gate;
        return ["order-1"];
      },
      attemptTicketEmailDelivery: async () => undefined,
    };
    const worker = new TicketEmailRetryWorker(service as never);

    const first = worker.runOnce();
    const second = worker.runOnce();
    await Promise.resolve();
    assert.equal(listCalls, 1);
    release();
    await Promise.all([first, second]);
  });
});

test("worker startup creates one timer and shutdown clears it", async () => {
  await withRetryConfig(async () => {
    let listCalls = 0;
    const service = {
      listDueTicketEmailDeliveryOrderIds: async () => { listCalls += 1; return []; },
      attemptTicketEmailDelivery: async () => undefined,
    };
    const worker = new TicketEmailRetryWorker(service as never);

    worker.start();
    worker.start();
    await new Promise((resolve) => setImmediate(resolve));
    worker.stop();
    worker.stop();

    assert.equal(listCalls, 1);
  });
});

test("per-order locking prevents duplicate email delivery and records one success", async () => {
  await withRetryConfig(async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let sendCalls = 0;
    const recorded: Record<string, unknown>[] = [];
    const order = {
      id: "order-1",
      orderNumber: "ORD-TEST-1",
      buyerEmail: "buyer@example.test",
      ticketDeliveryStatus: "PENDING" as const,
      ticketDeliveryAttemptCount: 0,
      tickets: [{ id: "ticket-1" }],
    };
    const repository = {
      getOrderForTicketDelivery: async () => order,
      getTicketEmailDeliverySummary: async () => repositorySummary(),
      recordTicketEmailDeliveryAttempt: async (input: Record<string, unknown>) => {
        recorded.push(input);
        return repositorySummary("order-1", "SENT");
      },
    };
    const emailService = {
      sendTicketDeliveryEmail: async () => {
        sendCalls += 1;
        await gate;
        return { status: "sent" as const, messageId: "message-1" };
      },
    };
    const service = new TicketsService(repository as never, emailService as never);

    const first = service.attemptTicketEmailDelivery("order-1", "AUTOMATIC");
    await Promise.resolve();
    const second = service.attemptTicketEmailDelivery("order-1", "AUTOMATIC");
    release();
    await Promise.all([first, second]);

    assert.equal(sendCalls, 1);
    assert.equal(recorded.length, 1);
    assert.equal(recorded[0].status, "SENT");
    assert.equal(recorded[0].attemptNumber, 1);
  });
});

test("failed delivery records retry state without creating payments, orders, or tickets", async () => {
  await withRetryConfig(async () => {
    let recorded: Record<string, unknown> | undefined;
    const repository = {
      getOrderForTicketDelivery: async () => ({
        id: "order-1",
        orderNumber: "ORD-TEST-1",
        buyerEmail: "buyer@example.test",
        ticketDeliveryStatus: "PENDING" as const,
        ticketDeliveryAttemptCount: 0,
        tickets: [{ id: "ticket-1" }],
      }),
      recordTicketEmailDeliveryAttempt: async (input: Record<string, unknown>) => {
        recorded = input;
        return repositorySummary();
      },
    };
    const emailService = {
      sendTicketDeliveryEmail: async () => { throw new Error("SMTP unavailable"); },
    };

    await new TicketsService(repository as never, emailService as never)
      .attemptTicketEmailDelivery("order-1", "AUTOMATIC");

    assert.equal(recorded?.status, "FAILED");
    assert.equal(recorded?.attemptNumber, 1);
    assert.ok(recorded?.nextRetryAt instanceof Date);
  });
});
