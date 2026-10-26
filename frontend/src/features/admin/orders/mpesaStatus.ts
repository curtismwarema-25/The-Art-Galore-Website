import type { AdminMpesaTransactionAuditRecord, AdminMpesaTransactionStatus } from "@/api/endpoints/payments";

export type MpesaStatusBadgeTone = "paid" | "initiating" | "pending" | "failed";

export function mpesaStatusTone(status: AdminMpesaTransactionStatus): MpesaStatusBadgeTone {
  if (status === "paid") return "paid";
  if (status === "initiated") return "initiating";
  if (status === "pending" || status === "ambiguous") return "pending";
  return "failed";
}

export function isMpesaManualReview(transaction: Pick<AdminMpesaTransactionAuditRecord, "status" | "reconciliationRequiresManualReview">) {
  return transaction.status === "ambiguous" || transaction.reconciliationRequiresManualReview;
}

export function canReverifyMpesaTransaction(
  transaction: Pick<AdminMpesaTransactionAuditRecord, "status" | "checkoutRequestId">,
) {
  return (
    Boolean(transaction.checkoutRequestId) &&
    (transaction.status === "initiated" || transaction.status === "pending" || transaction.status === "ambiguous")
  );
}
