import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeLogValue } from "./logger.js";

test("log sanitization redacts payment identifiers and secrets", () => {
  const result = sanitizeLogValue({
    checkoutRequestId: "checkout-sensitive",
    callbackSecret: "secret-sensitive",
    callbackPayload: { MpesaReceiptNumber: "receipt-sensitive" },
    resultCode: "0",
  }) as Record<string, unknown>;

  assert.match(String(result.checkoutRequestId), /^\[redacted:[0-9a-f]{12}\]$/);
  assert.equal(result.callbackSecret, "[redacted]");
  assert.equal(result.callbackPayload, "[redacted]");
  assert.equal(result.resultCode, "0");
});
