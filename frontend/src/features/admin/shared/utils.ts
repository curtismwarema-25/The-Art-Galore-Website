import {
  formCheckboxClassName,
  formCheckboxFieldClassName,
  formFileInputClassName,
  formHelperTextClassName,
  formInputClassName,
  formLabelClassName,
  formTextareaClassName,
} from "@/lib/formStyles";

export const adminInputClassName = formInputClassName;
export const adminTextareaClassName = formTextareaClassName;
export const adminFileInputClassName = formFileInputClassName;
export const adminLabelClassName = formLabelClassName;
export const adminHelperTextClassName = formHelperTextClassName;
export const adminCheckboxClassName = formCheckboxClassName;
export const adminCheckboxFieldClassName = formCheckboxFieldClassName;

export function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString()}`;
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
}

const ADMIN_STATUS_LABELS: Record<string, string> = {
  ambiguous: "Needs review",
  cancelled: "Cancelled",
  checked_in: "Checked in",
  failed: "Failed",
  expired: "Expired",
  initiated: "Started",
  not_submitted: "Not submitted",
  paid: "Paid",
  payment_rejected: "Payment rejected",
  payment_submitted: "Proof submitted",
  payment_verified: "Payment verified",
  pending_payment: "Awaiting payment",
  pending_review: "Pending review",
  refunded: "Refunded",
  revoked: "Revoked",
  sent: "Sent",
};

export function formatAdminStatus(status: string) {
  return ADMIN_STATUS_LABELS[status] ?? status.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
