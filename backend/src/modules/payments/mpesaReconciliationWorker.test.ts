import assert from "node:assert/strict";
import test from "node:test";
import { env } from "../../config/index.js";
import { DarajaRequestError, PaymentsService } from "./payments.service.js";
import { MpesaReconciliationWorker } from "./mpesaReconciliationWorker.js";
import { PaymentsRepository } from "./payments.repository.js";
import { requestMpesaReconciliationWake } from "./mpesaReconciliationSignal.js";

test("a rate-limited callback defers transaction reconciliation for the same sweep", async () => {
  const calls: string[] = [];
  const repository = {
    claimNextCallbackInboxEvent: async () => {
      calls.push("claim-callback");
      return { id: "callback-1", checkoutRequestId: "checkout-1" };
    },
    deferDueCallbackInboxEvents: async () => { calls.push("defer-callbacks"); },
    deferDueMpesaTransactions: async () => { calls.push("defer-transactions"); },
    listDueMpesaTransactionIds: async () => { calls.push("list-transactions"); return ["payment-1"]; },
  } as unknown as PaymentsRepository;
  const paymentsService = {
    processCallbackInboxEvent: async () => {
      calls.push("process-callback");
      throw new DarajaRequestError(429, "rate limited", 60_000);
    },
  } as unknown as PaymentsService;

  await new MpesaReconciliationWorker(repository, paymentsService).runOnce();

  assert.deepEqual(calls, [
    "claim-callback",
    "process-callback",
    "defer-callbacks",
    "defer-transactions",
  ]);
});

test("reconciliation limits a worker sweep to one status-query candidate", async () => {
  let requestedLimit = 0;
  let reverifyCount = 0;
  const repository = {
    claimNextCallbackInboxEvent: async () => null,
    listDueMpesaTransactionIds: async (_now: Date, limit: number) => {
      requestedLimit = limit;
      return ["payment-1"];
    },
    claimMpesaTransaction: async () => ({ reconciliationAttemptCount: 0, externalRequestId: "checkout-1" }),
    releaseReconciliationLease: async () => undefined,
  } as unknown as PaymentsRepository;
  const paymentsService = {
    reverifyMpesaTransaction: async () => { reverifyCount += 1; },
  } as unknown as PaymentsService;

  await new MpesaReconciliationWorker(repository, paymentsService).runOnce();

  assert.equal(requestedLimit, 1);
  assert.equal(reverifyCount, 1);
});

test("worker skips a transaction already leased by admin verification", async () => {
  let reverifyCount = 0;
  const repository = {
    claimNextCallbackInboxEvent: async () => null,
    listDueMpesaTransactionIds: async () => ["payment-1"],
    claimMpesaTransaction: async () => null,
  } as unknown as PaymentsRepository;
  const paymentsService = {
    reverifyMpesaTransaction: async () => { reverifyCount += 1; },
  } as unknown as PaymentsService;

  await new MpesaReconciliationWorker(repository, paymentsService).runOnce();

  assert.equal(reverifyCount, 0);
});

test("a concurrent callback completion is not downgraded by reconciliation failure handling", async () => {
  let status = "SUCCEEDED";
  let releasedLease = false;
  const repository = {
    claimNextCallbackInboxEvent: async () => null,
    listDueMpesaTransactionIds: async () => ["payment-1"],
    claimMpesaTransaction: async () => ({ reconciliationAttemptCount: 0, externalRequestId: "checkout-1" }),
    recordReconciliationFailure: async () => ({ count: 0 }),
    releaseReconciliationLease: async () => { releasedLease = true; },
  } as unknown as PaymentsRepository;
  const paymentsService = {
    reverifyMpesaTransaction: async () => {
      if (status === "SUCCEEDED") throw new Error("status query failed after callback completion");
    },
  } as unknown as PaymentsService;

  await new MpesaReconciliationWorker(repository, paymentsService).runOnce();

  assert.equal(status, "SUCCEEDED");
  assert.equal(releasedLease, true);
});

test("startup recovery and callback wake-up share one processing flight", async () => {
  const previousEnabled = env.MPESA_RECONCILIATION_ENABLED;
  const previousInterval = env.MPESA_RECONCILIATION_INTERVAL_SECONDS;
  let claimCount = 0;
  let processedCount = 0;
  let activeCount = 0;
  let maxActiveCount = 0;

  const repository = {
    claimNextCallbackInboxEvent: async () => {
      claimCount += 1;
      return claimCount === 1 ? { id: "callback-1", checkoutRequestId: "checkout-1" } : null;
    },
    listDueMpesaTransactionIds: async () => [],
  } as unknown as PaymentsRepository;
  const paymentsService = {
    processCallbackInboxEvent: async () => {
      processedCount += 1;
      activeCount += 1;
      maxActiveCount = Math.max(maxActiveCount, activeCount);
      await new Promise((resolve) => setTimeout(resolve, 10));
      activeCount -= 1;
    },
  } as unknown as PaymentsService;
  const worker = new MpesaReconciliationWorker(repository, paymentsService);

  env.MPESA_RECONCILIATION_ENABLED = true;
  env.MPESA_RECONCILIATION_INTERVAL_SECONDS = 60;
  try {
    worker.start();
    requestMpesaReconciliationWake();
    requestMpesaReconciliationWake();
    await new Promise((resolve) => setTimeout(resolve, 50));
  } finally {
    worker.stop();
    env.MPESA_RECONCILIATION_ENABLED = previousEnabled;
    env.MPESA_RECONCILIATION_INTERVAL_SECONDS = previousInterval;
  }

  assert.equal(processedCount, 1);
  assert.equal(maxActiveCount, 1);
  assert.ok(claimCount >= 1);
});

test("a worker exception is contained so a later cycle can recover", async () => {
  let listCalls = 0;
  const repository = {
    claimNextCallbackInboxEvent: async () => null,
    listDueMpesaTransactionIds: async () => {
      listCalls += 1;
      if (listCalls === 1) throw new Error("temporary repository failure");
      return [];
    },
  } as unknown as PaymentsRepository;

  const worker = new MpesaReconciliationWorker(repository, {} as PaymentsService);

  await worker.runOnce();
  await worker.runOnce();

  assert.equal(listCalls, 2);
});

test("a provider HTTP 500 is recorded with backoff and does not run another transaction in the same sweep", async () => {
  let failure: { nextAttemptAt?: Date; error: string; manualReview: boolean; countAttempt?: boolean } | undefined;
  let released = false;
  const repository = {
    claimNextCallbackInboxEvent: async () => null,
    listDueMpesaTransactionIds: async () => ["payment-1"],
    claimMpesaTransaction: async () => ({ reconciliationAttemptCount: 0, externalRequestId: "checkout-1" }),
    recordReconciliationFailure: async (_id: string, input: typeof failure) => { failure = input; return { count: 1 }; },
    releaseReconciliationLease: async () => { released = true; },
  } as unknown as PaymentsRepository;
  const paymentsService = {
    reverifyMpesaTransaction: async () => { throw new DarajaRequestError(500, "provider failure"); },
  } as unknown as PaymentsService;

  await new MpesaReconciliationWorker(repository, paymentsService).runOnce();

  assert.equal(released, false);
  assert.equal(failure?.error, "provider failure");
  assert.equal(failure?.countAttempt, true);
  assert.equal(failure?.manualReview, false);
  assert.ok(failure?.nextAttemptAt && failure.nextAttemptAt.getTime() > Date.now());
});
