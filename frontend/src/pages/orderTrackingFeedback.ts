import type { OrderLifecycleStatus, OrderPaymentStatus } from "@/api/endpoints/orders";

export type StkFeedbackKind =
  | "submitting"
  | "prompt_sent"
  | "pending"
  | "uncertain"
  | "failed"
  | "tickets_pending"
  | "idle";

export type StkFeedbackState = {
  kind: StkFeedbackKind;
  message: string;
  canRetry: boolean;
};

export type StkFeedbackInput = {
  orderStatus: OrderLifecycleStatus;
  paymentStatus: OrderPaymentStatus;
  canSubmitPaymentProof: boolean;
  mpesaPaymentPending: boolean;
  manualReviewRequired: boolean;
  ticketCount: number;
  stkRequested: boolean;
  initiationPending: boolean;
  initiationSuccess: boolean;
  initiationError: boolean;
  elapsedMs?: number;
  reservationExpiry: string;
};

export type CanStartPaymentInput = {
  canSubmitPaymentProof: boolean;
  paymentProcessing: boolean;
  stkRequested: boolean;
};

export function canStartPayment(input: CanStartPaymentInput) {
  return input.canSubmitPaymentProof
    && !input.paymentProcessing
    && !input.stkRequested;
}

export function getStkFeedbackState(input: StkFeedbackInput): StkFeedbackState | null {
  if (input.paymentStatus === "paid") {
    if (input.ticketCount === 0) {
      return {
        kind: "tickets_pending",
        message: "Payment is confirmed. We're preparing your tickets now; this page will update automatically.",
        canRetry: false,
      };
    }

    return null;
  }

  if (input.manualReviewRequired) {
    return {
      kind: "uncertain",
      message: "We couldn't confirm this payment automatically. Our team needs to review it; do not start another payment.",
      canRetry: false,
    };
  }

  if (input.initiationPending) {
    return {
      kind: "submitting",
      message: "Sending the M-Pesa prompt. Keep this order page open for now.",
      canRetry: false,
    };
  }

  if (input.initiationError) {
    if (input.mpesaPaymentPending || input.stkRequested) {
      return {
        kind: "uncertain",
        message: "We couldn't confirm whether the M-Pesa prompt was sent. Do not start another payment while we verify this attempt.",
        canRetry: false,
      };
    }

    return {
      kind: "failed",
      message: input.canSubmitPaymentProof
        ? "The M-Pesa prompt was not accepted. You can retry because this order is eligible for another payment attempt."
        : "The payment request failed. Check the order status before trying again.",
      canRetry: input.canSubmitPaymentProof,
    };
  }

  if (input.paymentStatus === "failed") {
    const canRetry = input.canSubmitPaymentProof && !input.mpesaPaymentPending;
    return {
      kind: "failed",
      message: canRetry
        ? "The M-Pesa payment failed. You can retry because this order is eligible for another payment attempt."
        : "The M-Pesa payment failed. Check the order status before trying again.",
      canRetry,
    };
  }

  if (input.initiationSuccess && (!input.mpesaPaymentPending || (input.elapsedMs ?? 0) < 10_000)) {
    return {
      kind: "prompt_sent",
      message: "M-Pesa prompt sent. Check your phone and enter your PIN.",
      canRetry: false,
    };
  }

  if (input.mpesaPaymentPending || input.stkRequested || (input.orderStatus === "payment_submitted" && input.paymentStatus === "pending")) {
    return {
      kind: "pending",
      message: "We're checking payment confirmation with M-Pesa. Do not start another payment while this one is pending.",
      canRetry: false,
    };
  }

  if (input.canSubmitPaymentProof && input.orderStatus !== "payment_rejected") {
    return {
      kind: "idle",
      message: `Complete the M-Pesa prompt before ${input.reservationExpiry}.`,
      canRetry: false,
    };
  }

  return null;
}
