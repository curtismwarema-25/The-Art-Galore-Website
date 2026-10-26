import assert from "node:assert/strict";
import test from "node:test";
import { PaymentStatus } from "@prisma/client";
import { buildDueMpesaTransactionWhere } from "./payments.repository.js";

test("automatic reconciliation excludes reserved transactions without Daraja identifiers", () => {
  const now = new Date("2026-10-24T12:00:00.000Z");
  const where = buildDueMpesaTransactionWhere(now);

  assert.deepEqual(where.externalRequestId, { not: null });
  assert.deepEqual(where.status, { in: [PaymentStatus.INITIATED, PaymentStatus.PENDING, PaymentStatus.AMBIGUOUS] });
  assert.equal(where.reconciliationRequiresManualReview, false);
});
