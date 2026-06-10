import { apiRequest } from "@/api/client";
import type { TicketDeliveryStatus } from "@/types/models";

type ApiData<T> = {
  data: T;
};

export type ManualPaymentMethod = "bank" | "mpesa" | "manual";

export type ManualPaymentScreenshot = {
  url: string;
  storageKey: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
};

export type SubmitManualPaymentProofInput = {
  paymentMethod: ManualPaymentMethod;
  payerName: string;
  phoneNumber: string;
  amountPaid: number;
  transactionReference: string;
  screenshot?: ManualPaymentScreenshot;
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

export type AdminMpesaTransactionStatus = "initiated" | "pending" | "paid" | "failed" | "cancelled" | "refunded";

export type AdminMpesaTransactionAuditRecord = {
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
  status: AdminMpesaTransactionStatus;
  initiatedAt: string;
  completedAt?: string;
  callbackReceived: boolean;
  rawCallback?: unknown;
};

export type AdminMpesaTransactionAuditFilters = {
  orderId?: string;
  search?: string;
  status?: AdminMpesaTransactionStatus;
  limit?: number;
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

function buildAdminManualPaymentsPath(filters?: AdminManualPaymentQueueFilters) {
  if (!filters) {
    return "/admin/payments/manual-submissions";
  }

  const query = new URLSearchParams();
  if (filters.verificationStatus) query.set("verificationStatus", filters.verificationStatus);
  if (filters.orderId) query.set("orderId", filters.orderId);
  if (filters.search) query.set("search", filters.search);

  const queryText = query.toString();
  return queryText ? `/admin/payments/manual-submissions?${queryText}` : "/admin/payments/manual-submissions";
}

function buildAdminMpesaTransactionsPath(filters?: AdminMpesaTransactionAuditFilters) {
  if (!filters) {
    return "/admin/payments/mpesa-transactions";
  }

  const query = new URLSearchParams();
  if (filters.orderId) query.set("orderId", filters.orderId);
  if (filters.search) query.set("search", filters.search);
  if (filters.status) query.set("status", filters.status);
  if (filters.limit) query.set("limit", filters.limit.toString());

  const queryText = query.toString();
  return queryText ? `/admin/payments/mpesa-transactions?${queryText}` : "/admin/payments/mpesa-transactions";
}

export async function submitManualPaymentProof(publicToken: string, input: SubmitManualPaymentProofInput) {
  const response = await apiRequest<ApiData<SubmittedPaymentProofRecord>>(`/payments/manual/${publicToken}/proof`, {
    method: "POST",
    body: input,
  });

  return response.data;
}

export async function listAdminManualPaymentQueue(filters?: AdminManualPaymentQueueFilters) {
  const response = await apiRequest<ApiData<AdminManualPaymentQueueRecord[]>>(buildAdminManualPaymentsPath(filters), {
    method: "GET",
  });

  return response.data;
}

export async function listAdminMpesaTransactions(filters?: AdminMpesaTransactionAuditFilters) {
  const response = await apiRequest<ApiData<AdminMpesaTransactionAuditRecord[]>>(buildAdminMpesaTransactionsPath(filters), {
    method: "GET",
  });

  return response.data;
}

export async function approveAdminManualPaymentSubmission(id: string, verificationNote?: string) {
  const response = await apiRequest<ApiData<{ orderNumber: string; ticketsIssued: number; ticketDeliveryStatus: TicketDeliveryStatus }>>(
    `/admin/payments/manual-submissions/${id}/approve`,
    {
      method: "POST",
      body: { verificationNote },
    },
  );

  return response.data;
}

export async function rejectAdminManualPaymentSubmission(id: string, verificationNote?: string) {
  const response = await apiRequest<ApiData<{ orderNumber: string }>>(`/admin/payments/manual-submissions/${id}/reject`, {
    method: "POST",
    body: { verificationNote },
  });

  return response.data;
}

export async function reverifyAdminMpesaTransaction(id: string) {
  const response = await apiRequest<
    ApiData<{
      orderNumber: string;
      status: AdminMpesaTransactionStatus;
      resultCode?: string;
      resultDesc?: string;
      ticketsIssued?: number;
      ticketDeliveryStatus?: TicketDeliveryStatus;
    }>
  >(`/admin/payments/mpesa-transactions/${id}/reverify`, {
    method: "POST",
  });

  return response.data;
}

export async function initiateMpesaStkPush(publicToken: string, input: InitiateStkPushInput, idempotencyKey?: string) {
  const headers: HeadersInit | undefined = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;
  const response = await apiRequest<ApiData<InitiateStkPushResult>>(`/payments/mpesa/stk/${publicToken}/initiate`, {
    method: "POST",
    headers,
    body: input,
  });

  return response.data;
}
