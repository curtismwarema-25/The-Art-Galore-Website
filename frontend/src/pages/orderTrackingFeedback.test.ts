import { describe, expect, it } from "vitest";
import {
  canStartPayment,
  getStkFeedbackState,
  type StkFeedbackInput,
} from "./orderTrackingFeedback";

const baseInput: StkFeedbackInput = {
  orderStatus: "pending_payment",
  paymentStatus: "pending",
  canSubmitPaymentProof: true,
  mpesaPaymentPending: false,
  ticketCount: 0,
  stkRequested: false,
  initiationPending: false,
  initiationSuccess: false,
  initiationError: false,
  elapsedMs: 0,
  reservationExpiry: "tomorrow at 5:00 PM",
};

describe("persistent M-Pesa checkout feedback", () => {
  it("keeps a pending message visible after stkRequested disables new controls", () => {
    const state = getStkFeedbackState({ ...baseInput, stkRequested: true });

    expect(state?.kind).toBe("pending");
    expect(state?.message).toContain("Do not start another payment");
    expect(canStartPayment({
      canSubmitPaymentProof: true,
      paymentProcessing: false,
      stkRequested: true,
    })).toBe(false);
  });

  it("shows submission progress while the initiation mutation is pending", () => {
    expect(getStkFeedbackState({ ...baseInput, initiationPending: true })?.kind).toBe("submitting");
  });

  it("keeps prompt-sent feedback after initiation completes", () => {
    const state = getStkFeedbackState({ ...baseInput, initiationSuccess: true });

    expect(state?.kind).toBe("prompt_sent");
    expect(state?.message).toContain("enter your PIN");
  });

  it("distinguishes an active uncertain outcome from a retryable failure", () => {
    const uncertain = getStkFeedbackState({
      ...baseInput,
      stkRequested: true,
      mpesaPaymentPending: true,
      initiationError: true,
    });
    const failed = getStkFeedbackState({ ...baseInput, initiationError: true });

    expect(uncertain?.kind).toBe("uncertain");
    expect(uncertain?.canRetry).toBe(false);
    expect(failed?.kind).toBe("failed");
    expect(failed?.canRetry).toBe(true);
  });

  it("shows a retry option only for a definitive failure that the backend marks retryable", () => {
    const failed = getStkFeedbackState({ ...baseInput, paymentStatus: "failed" });
    const blocked = getStkFeedbackState({
      ...baseInput,
      paymentStatus: "failed",
      canSubmitPaymentProof: false,
    });

    expect(failed?.kind).toBe("failed");
    expect(failed?.canRetry).toBe(true);
    expect(blocked?.kind).toBe("failed");
    expect(blocked?.canRetry).toBe(false);
  });

  it("keeps confirmed payment feedback visible while tickets are being prepared", () => {
    const state = getStkFeedbackState({ ...baseInput, paymentStatus: "paid" });

    expect(state?.kind).toBe("tickets_pending");
    expect(state?.message).toContain("preparing your tickets");
  });

  it("stops rendering payment feedback once tickets are available", () => {
    expect(getStkFeedbackState({ ...baseInput, paymentStatus: "paid", ticketCount: 1 })).toBeNull();
  });
});
