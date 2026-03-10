import type { OrderRecord } from "@/types/models";
import StatusBadge from "@/components/common/StatusBadge";

type OrderCardProps = {
  order: OrderRecord;
  buyerName: string;
};

export default function OrderCard({ order, buyerName }: OrderCardProps) {
  return (
    <article className="rounded-md border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="font-display text-sm text-foreground">{order.id}</h3>
        <div className="flex gap-2">
          <StatusBadge tone={order.paymentStatus === "paid" ? "paid" : order.paymentStatus === "pending" ? "pending" : "failed"} />
          <StatusBadge tone={order.checkedInStatus === "checked-in" ? "checked-in" : "draft"} />
        </div>
      </div>
      <p className="text-sm text-foreground-secondary">{buyerName}</p>
      <p className="text-xs text-foreground-secondary mt-1">
        Qty {order.quantity} | {order.currency} {order.amount.toLocaleString()}
      </p>
    </article>
  );
}
