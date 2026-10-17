import { describe, expect, it } from "vitest";
import { canReverifyMpesaTransaction, isMpesaManualReview, mpesaStatusTone } from "./mpesaStatus";

describe("admin M-Pesa manual-review state", () => {
  it("keeps ambiguous transactions visible as pending rather than failed", () => {
    expect(mpesaStatusTone("ambiguous")).toBe("pending");
    expect(isMpesaManualReview({ status: "ambiguous", reconciliationRequiresManualReview: false })).toBe(true);
  });

  it("allows only existing-request status checks", () => {
    expect(canReverifyMpesaTransaction({ status: "ambiguous", checkoutRequestId: "checkout-1" })).toBe(true);
    expect(canReverifyMpesaTransaction({ status: "ambiguous" })).toBe(false);
    expect(canReverifyMpesaTransaction({ status: "paid", checkoutRequestId: "checkout-1" })).toBe(false);
  });
});
