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
