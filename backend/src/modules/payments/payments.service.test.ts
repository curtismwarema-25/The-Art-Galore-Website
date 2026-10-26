import { OrderStatus, PaymentProvider, PaymentStatus } from "@prisma/client";
import assert from "node:assert/strict";
import test from "node:test";
import { isDefinitiveDarajaRejection, PaymentsService } from "./payments.service.js";
import { PaymentsRepository } from "./payments.repository.js";

function createServiceForPureTests() {
  return new PaymentsService({} as never, {} as never) as unknown as {
    shouldAcceptLateSuccess: (orderStatus: OrderStatus, reservationExpiresAt: Date, now: Date) => { accept: boolean; review: boolean };
    extractCallbackMetadata: (payload: unknown) => {
      merchantRequestId?: string;
      checkoutRequestId?: string;
      resultCode: number;
      resultDesc: string;
      metadataMap: Map<string, string | number | undefined>;
    };
  };
}

test("expired late M-Pesa success is accepted within the grace window", () => {
  const service = createServiceForPureTests();
  const now = new Date("2026-05-26T12:05:00.000Z");
  const expiredAt = new Date("2026-05-26T12:00:00.000Z");

  assert.deepEqual(service.shouldAcceptLateSuccess(OrderStatus.EXPIRED, expiredAt, now), {
    accept: true,
    review: false,
  });
});

test("non-expired M-Pesa success remains acceptable", () => {
  const service = createServiceForPureTests();
  const now = new Date("2026-05-26T12:10:00.000Z");
  const futureExpiry = new Date("2026-05-26T12:30:00.000Z");

  assert.deepEqual(service.shouldAcceptLateSuccess(OrderStatus.PENDING_PAYMENT, futureExpiry, now), {
    accept: true,
    review: false,
  });
});

test("callback metadata extraction reads checkout, merchant, result, and receipt", () => {
  const service = createServiceForPureTests();
  const result = service.extractCallbackMetadata({
    Body: {
      stkCallback: {
        MerchantRequestID: "merchant-123",
        CheckoutRequestID: "checkout-456",
        ResultCode: 0,
        ResultDesc: "Success",
        CallbackMetadata: {
          Item: [{ Name: "MpesaReceiptNumber", Value: "ABC123" }],
        },
      },
    },
  });

  assert.equal(result.merchantRequestId, "merchant-123");
  assert.equal(result.checkoutRequestId, "checkout-456");
  assert.equal(result.resultCode, 0);
  assert.equal(result.resultDesc, "Success");
  assert.equal(result.metadataMap.get("MpesaReceiptNumber"), "ABC123");
});

test("only explicit Daraja client errors classify an STK request as rejected", () => {
  assert.equal(isDefinitiveDarajaRejection(400), true);
  assert.equal(isDefinitiveDarajaRejection(429), true);
  assert.equal(isDefinitiveDarajaRejection(408), false);
  assert.equal(isDefinitiveDarajaRejection(200), false);
  assert.equal(isDefinitiveDarajaRejection(302), false);
  assert.equal(isDefinitiveDarajaRejection(500), false);
});

function createReservationTx({ status = OrderStatus.PENDING_PAYMENT, existing, active }: { status?: OrderStatus; existing?: object; active?: object } = {}) {
  const created: Array<Record<string, unknown>> = [];
  const calls: string[] = [];
  const tx = {
    $queryRaw: async () => { calls.push("lock"); return []; },
    order: { findUnique: async () => ({ status }) },
    paymentTransaction: {
      findUnique: async () => existing ?? null,
      findFirst: async () => active ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return { id: "transaction-1", ...data };
      },
    },
  };
  return { tx, created, calls };
}

const reservationInput = {
  orderId: "order-1",
  amount: 2500,
  currency: "KES",
  idempotencyKey: "checkout-key-1",
  providerAccountKey: "174379",
  payerPhone: "254700000000",
  rawRequest: { amount: 2500 },
};

test("M-Pesa reservation writes an initiated transaction before any provider request", async () => {
  const { tx, created, calls } = createReservationTx();
  const result = await new PaymentsRepository().reserveMpesaStkTransaction(reservationInput, tx as never);
  assert.deepEqual(calls, ["lock"]);
  assert.equal(result.created, true);
  assert.equal(created[0].status, PaymentStatus.INITIATED);
  assert.equal(created[0].provider, PaymentProvider.MPESA);
  assert.equal(created[0].idempotencyKey, "checkout-key-1");
});

test("M-Pesa reservation reuses an idempotent transaction and does not create another", async () => {
  const prior = { id: "prior-transaction" };
  const { tx, created } = createReservationTx({ existing: prior });
  const result = await new PaymentsRepository().reserveMpesaStkTransaction(reservationInput, tx as never);
  assert.equal(result.created, false);
  assert.equal(result.transaction, prior);
  assert.equal(created.length, 0);
});

test("M-Pesa reservation does not issue a second prompt while an active attempt exists", async () => {
  const active = { id: "active-transaction", status: PaymentStatus.AMBIGUOUS };
  const { tx, created } = createReservationTx({ active });
  const result = await new PaymentsRepository().reserveMpesaStkTransaction(reservationInput, tx as never);
  assert.equal(result.created, false);
  assert.equal(result.transaction, active);
  assert.equal(created.length, 0);
});

test("M-Pesa reservation rejects an order that is no longer payable", async () => {
  const { tx, created } = createReservationTx({ status: OrderStatus.PAID });
  await assert.rejects(() => new PaymentsRepository().reserveMpesaStkTransaction(reservationInput, tx as never), /no longer eligible/);
  assert.equal(created.length, 0);
});
