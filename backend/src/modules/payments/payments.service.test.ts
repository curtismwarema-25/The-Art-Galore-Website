import { OrderStatus } from "@prisma/client";
import assert from "node:assert/strict";
import test from "node:test";
import { PaymentsService } from "./payments.service.js";

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

test("reject policy does not accept expired late M-Pesa success", () => {
  const service = createServiceForPureTests();
  const now = new Date("2026-05-26T12:30:00.000Z");
  const expiredAt = new Date("2026-05-26T12:00:00.000Z");

  assert.deepEqual(service.shouldAcceptLateSuccess(OrderStatus.EXPIRED, expiredAt, now), {
    accept: false,
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
