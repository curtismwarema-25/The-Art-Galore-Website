import assert from "node:assert/strict";
import test from "node:test";
import { DarajaRequestError, PaymentsService } from "./payments.service.js";
import { MpesaReconciliationWorker } from "./mpesaReconciliationWorker.js";
import { PaymentsRepository } from "./payments.repository.js";

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
