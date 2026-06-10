export type ManualPaymentMethod = "bank" | "mpesa" | "manual";

export type SubmitManualPaymentInput = {
  paymentMethod: ManualPaymentMethod;
  payerName: string;
  phoneNumber: string;
  amountPaid: number;
  transactionReference: string;
  screenshot?: {
    url: string;
    storageKey: string;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    sizeBytes: number;
  };
  notes?: string;
};

export type SubmittedPaymentProofRecord = {
  id: string;
  orderNumber: string;
  submittedAt: string;
  verificationStatus: "pending_review" | "approved" | "rejected";
};

export type AdminManualPaymentQueueRecord = {
  id: string;
  orderId: string;
  orderNumber: string;
  eventTitle: string;
  payerName: string;
  phoneNumber: string;
  amountPaid: number;
  currency: string;
  transactionReference: string;
  screenshotUrl?: string;
  notes?: string;
  submittedAt: string;
  verificationStatus: "pending_review" | "approved" | "rejected";
  verificationNote?: string;
  orderStatus: "pending_payment" | "payment_submitted" | "payment_verified" | "payment_rejected" | "paid" | "expired";
};

export type AdminManualPaymentQueueFilters = {
  verificationStatus?: "pending_review" | "approved" | "rejected";
  orderId?: string;
  search?: string;
};

export type ReviewManualPaymentInput = {
  verificationNote?: string;
};

export type InitiateStkPushInput = {
  phoneNumber: string;
};

export type InitiateStkPushResult = {
  orderNumber: string;
  customerMessage: string;
  responseCode: string;
  paymentStatus: "pending";
};

export type MpesaTransactionAuditFilters = {
  orderId?: string;
  search?: string;
  status?: "initiated" | "pending" | "paid" | "failed" | "cancelled" | "refunded";
  limit?: number;
};

export type MpesaTransactionAuditRecord = {
  id: string;
  orderId: string;
  orderNumber: string;
  buyerPhone: string;
  amount: number;
  currency: string;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  externalTransactionId?: string;
  resultCode?: string;
  resultDesc?: string;
  status: "initiated" | "pending" | "paid" | "failed" | "cancelled" | "refunded";
  initiatedAt: string;
  completedAt?: string;
  callbackReceived: boolean;
  rawCallback?: unknown;
};

export type ReverifyMpesaTransactionResult = {
  orderNumber: string;
  status: "initiated" | "pending" | "paid" | "failed" | "cancelled" | "refunded";
  resultCode?: string;
  resultDesc?: string;
  ticketsIssued?: number;
  ticketDeliveryStatus?: "pending" | "sent" | "failed";
};
