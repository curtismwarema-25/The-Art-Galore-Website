import { getTicketPurchaseLimit, type TicketTier } from "@/types/models";

type OrderSummaryCardProps = {
  tiers: TicketTier[];
  quantities: Record<string, number>;
  phoneNumber: string;
};

export default function OrderSummaryCard({ tiers, quantities, phoneNumber }: OrderSummaryCardProps) {
  const selectedRows = tiers
    .map((tier) => {
      const quantity = Math.min(Math.max(quantities[tier.id] ?? 0, 0), getTicketPurchaseLimit(tier));
      return {
        tierId: tier.id,
        name: tier.name,
        quantity,
        subtotal: quantity * tier.price,
        currency: tier.currency,
      };
    })
    .filter((row) => row.quantity > 0);

  const currencies = Array.from(new Set(selectedRows.map((row) => row.currency)));
  const total = selectedRows.reduce((sum, row) => sum + row.subtotal, 0);
  const currency = currencies.length === 1 ? currencies[0] : undefined;

  return (
    <aside className="rounded-[var(--radius-md)] border border-border bg-secondary/15 p-4">
      <h4 className="mb-3 font-display text-sm text-foreground">Order Summary</h4>
      {selectedRows.length === 0 ? (
        <p className="text-xs text-foreground-secondary">Select an available ticket to see your order summary.</p>
      ) : (
        <div className="mb-3 space-y-2">
          {selectedRows.map((row) => (
            <div key={row.tierId} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-foreground-secondary">{row.name} × {row.quantity}</span>
              <span className="shrink-0 text-foreground">{row.currency} {row.subtotal.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
        <span className="font-display text-foreground">Total</span>
        <span className="font-display text-foreground">
          {currency ? `${currency} ${total.toLocaleString()}` : "—"}
        </span>
      </div>
      {phoneNumber && <p className="mt-3 text-[11px] text-foreground-secondary">M-Pesa number: {phoneNumber}</p>}
    </aside>
  );
}
