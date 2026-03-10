export const adminInputClassName =
  "w-full border border-border bg-background text-foreground text-sm rounded-md px-3 py-2.5 font-body outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors";

export const adminTextareaClassName = `${adminInputClassName} min-h-[96px] resize-y`;

export function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString()}`;
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
}
