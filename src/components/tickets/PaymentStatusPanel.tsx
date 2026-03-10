import StatusBadge from "@/components/common/StatusBadge";
import type { PaymentStatus } from "@/types/models";

type PaymentStatusPanelProps = {
  status: PaymentStatus;
};

const statusCopy: Record<PaymentStatus, string> = {
  idle: "Ready for payment initiation.",
  initiating: "Starting payment request...",
  pending: "Payment request sent. Confirm on M-Pesa.",
  paid: "Payment confirmed. Ticket is ready.",
  failed: "Payment failed. Try again or use a different number.",
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
