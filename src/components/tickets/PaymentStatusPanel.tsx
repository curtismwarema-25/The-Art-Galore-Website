import StatusBadge from "@/components/common/StatusBadge";
import type { PaymentStatus } from "@/types/models";

type PaymentStatusPanelProps = {
  status: PaymentStatus;
};

const statusCopy: Record<PaymentStatus, string> = {
  idle: "Ready for payment initiation.",
  initiating: "Creating your guest order...",
  pending: "Order created. You will submit manual payment proof on the tracking page.",
  paid: "Payment verified. Ticket is ready.",
  failed: "Payment flow failed. Try again.",
  refunded: "Payment refunded.",
};

export default function PaymentStatusPanel({ status }: PaymentStatusPanelProps) {
  return (
    <div className="border border-border rounded-md p-4 bg-background">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="font-display text-sm text-foreground">Payment Status</h4>
        <StatusBadge tone={status} />
      </div>
      <p className="text-xs text-foreground-secondary">{statusCopy[status]}</p>
    </div>
  );
}
