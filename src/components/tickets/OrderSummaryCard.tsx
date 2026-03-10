import type { TicketTier } from "@/types/models";

type OrderSummaryCardProps = {
  tiers: TicketTier[];
  quantities: Record<string, number>;
  phoneNumber: string;
};

export default function OrderSummaryCard({ tiers, quantities, phoneNumber }: OrderSummaryCardProps) {
  const selectedRows = tiers
    .filter((tier) => (quantities[tier.id] ?? 0) > 0)
    .map((tier) => ({
      tierId: tier.id,
      name: tier.name,
      quantity: quantities[tier.id] ?? 0,
      subtotal: (quantities[tier.id] ?? 0) * tier.price,
      currency: tier.currency,
    }));

  const total = selectedRows.reduce((sum, row) => sum + row.subtotal, 0);

  return (
    <aside className="border border-border rounded-md p-4 bg-secondary/15">
      <h4 className="font-display text-sm text-foreground mb-3">Order Summary</h4>
      {selectedRows.length === 0 ? (
        <p className="text-xs text-foreground-secondary">Select a ticket tier to see your order summary.</p>
      ) : (
        <div className="space-y-2 mb-3">
          {selectedRows.map((row) => (
            <div key={row.tierId} className="flex items-center justify-between text-xs">
              <span className="text-foreground-secondary">{row.name} x {row.quantity}</span>
              <span className="text-foreground">{row.currency} {row.subtotal.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      <div className="pt-2 border-t border-border flex items-center justify-between text-sm">
        <span className="font-display text-foreground">Total</span>
        <span className="font-display text-foreground">KES {total.toLocaleString()}</span>
      </div>
      <p className="text-[11px] text-foreground-secondary mt-3">
        M-Pesa number: {phoneNumber || "Not provided"}
      </p>
    </aside>
  );
}
