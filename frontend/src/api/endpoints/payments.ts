import { apiRequest } from "@/api/client";

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

export async function approveAdminManualPaymentSubmission(id: string, verificationNote?: string) {
  const response = await apiRequest<ApiData<{ orderNumber: string; ticketsIssued: number }>>(
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
