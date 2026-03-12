import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/common/DataTable";
import EmptyState from "@/components/common/EmptyState";
import FilterBar from "@/components/common/FilterBar";
import SectionHeader from "@/components/common/SectionHeader";
import StatusBadge from "@/components/common/StatusBadge";
import AdminSectionCard from "@/features/admin/shared/AdminSectionCard";
import { formatDateTime, formatMoney } from "@/features/admin/shared/utils";
import { useIssueTicketsMutation } from "@/hooks/mutations/useIssueTicketsMutation";
import { useApproveManualPaymentMutation, useRejectManualPaymentMutation } from "@/hooks/mutations/usePaymentMutations";
import { useAdminManualPaymentsQuery } from "@/hooks/queries/useAdminManualPaymentsQuery";
import { useAdminOrderQuery, useAdminOrdersQuery } from "@/hooks/queries/useAdminOrdersQuery";
import { useEventsQuery } from "@/hooks/queries/useEventsQuery";
import type { OrderLifecycleStatus } from "@/api/endpoints/orders";
import { toast } from "@/components/ui/sonner";

const ORDER_STATUS_FILTER_OPTIONS: Array<{ label: string; value: "all" | OrderLifecycleStatus }> = [
  { label: "All", value: "all" },
  { label: "Pending Payment", value: "pending_payment" },
  { label: "Payment Submitted", value: "payment_submitted" },
  { label: "Payment Verified", value: "payment_verified" },
  { label: "Payment Rejected", value: "payment_rejected" },
  { label: "Paid", value: "paid" },
  { label: "Expired", value: "expired" },
];

function orderStatusTone(status: OrderLifecycleStatus) {
  if (status === "paid" || status === "payment_verified") return "paid";
  if (status === "payment_rejected" || status === "expired") return "rejected";
  return "pending";
}

function verificationTone(status: "pending_review" | "approved" | "rejected") {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "pending";
}

export default function AdminOrdersPage() {
  const { id: routeOrderId } = useParams();
  const [search, setSearch] = useState("");
  const [statusFilterValue, setStatusFilterValue] = useState<"all" | OrderLifecycleStatus>("all");
  const [eventFilter, setEventFilter] = useState("all");

  const statusFilter = statusFilterValue === "all" ? undefined : statusFilterValue;
  const scopedEventId = eventFilter === "all" ? undefined : eventFilter;

  const { data: orders = [], isLoading, isError } = useAdminOrdersQuery({
    search: search.trim() || undefined,
    status: statusFilter,
    eventId: scopedEventId,
  });
  const { data: selectedOrder, isLoading: isSelectedLoading } = useAdminOrderQuery(routeOrderId ?? "");
  const { data: manualPayments = [], isLoading: isManualPaymentsLoading } = useAdminManualPaymentsQuery({
    verificationStatus: "pending_review",
    search: search.trim() || undefined,
    orderId: routeOrderId,
  });
  const { data: events = [] } = useEventsQuery();
  const approveMutation = useApproveManualPaymentMutation();
  const rejectMutation = useRejectManualPaymentMutation();
  const issueTicketsMutation = useIssueTicketsMutation();

  const eventOptions = useMemo(
    () => [{ label: "All Events", value: "all" }].concat(events.map((event) => ({ label: event.title, value: event.id }))),
    [events],
  );

  const reviewPending = approveMutation.isPending || rejectMutation.isPending;

  const approve = async (submissionId: string) => {
    const note = window.prompt("Optional verification note (approval):") ?? undefined;
    try {
      const result = await approveMutation.mutateAsync({
        id: submissionId,
        verificationNote: note?.trim() || undefined,
      });
      toast.success(`Payment approved for ${result.orderNumber}. ${result.ticketsIssued} ticket(s) issued.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not approve payment.");
    }
  };

  const reject = async (submissionId: string) => {
    const note = window.prompt("Add rejection note for buyer:");
    try {
      const result = await rejectMutation.mutateAsync({
        id: submissionId,
        verificationNote: note?.trim() || undefined,
      });
      toast.success(`Payment rejected for ${result.orderNumber}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reject payment.");
    }
  };

  const issueTickets = async () => {
    if (!selectedOrder) return;

    try {
      const result = await issueTicketsMutation.mutateAsync(selectedOrder.id);
      toast.success(`Issued ${result.ticketsIssued} ticket(s) for ${result.orderNumber}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not issue tickets.");
    }
  };

  if (isLoading) {
    return <p className="text-sm text-foreground-secondary">Loading orders...</p>;
  }

  if (isError) {
    return <EmptyState title="Could not load orders" description="Check backend order endpoints and admin auth session." />;
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <SectionHeader
        title="Ticket & Order Manager"
        subtitle="Review guest checkout orders, moderate manual payment submissions, and issue tickets."
        action={
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/checkin">Open Check-In</Link>
          </Button>
        }
      />

      <AdminSectionCard title="Orders List">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by order number, buyer, phone, or event"
          filters={[
            {
              key: "status",
              label: "Order Status",
              value: statusFilterValue,
              onChange: (value) => setStatusFilterValue(value as "all" | OrderLifecycleStatus),
              options: ORDER_STATUS_FILTER_OPTIONS,
            },
            {
              key: "event",
              label: "Event",
              value: eventFilter,
              onChange: setEventFilter,
              options: eventOptions,
            },
          ]}
        />

        <div className="mt-4">
          {orders.length === 0 ? (
            <EmptyState title="No orders match filters" description="Try changing filters or search terms." />
          ) : (
            <DataTable headers={["Order", "Buyer", "Event", "Items", "Amount", "Order Status", "Verification", "Actions"]} minWidthClassName="min-w-[820px] md:min-w-[1080px]">
              {orders.map((order) => (
                <tr key={order.id} className="bg-background border border-border">
                  <td className="px-3 py-3 text-sm text-foreground">{order.orderNumber}</td>
                  <td className="px-3 py-3 text-sm text-foreground-secondary">
                    <p>{order.buyer.buyerName}</p>
                    <p className="text-xs">{order.buyer.buyerPhone}</p>
                  </td>
                  <td className="px-3 py-3 text-sm text-foreground-secondary">{order.event.title}</td>
                  <td className="px-3 py-3 text-sm text-foreground-secondary">
                    {order.items.map((item) => `${item.ticketTierName} x${item.quantity}`).join(", ")}
                  </td>
                  <td className="px-3 py-3 text-sm text-foreground-secondary">{formatMoney(order.currency, order.totalAmount)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge tone={orderStatusTone(order.status)} label={order.status} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge tone={verificationTone(order.verificationStatus)} label={order.verificationStatus} />
                  </td>
                  <td className="px-3 py-3">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/admin/orders/${order.id}`}>Details</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Manual Payment Verification Queue">
        {isManualPaymentsLoading ? (
          <p className="text-sm text-foreground-secondary">Loading manual payment submissions...</p>
        ) : manualPayments.length === 0 ? (
          <EmptyState title="No pending manual payments" description="New payment proof submissions will appear here for review." />
        ) : (
          <DataTable
            headers={["Order", "Payer", "Event", "Amount", "Transaction Ref", "Screenshot", "Submitted", "Actions"]}
            minWidthClassName="min-w-[900px] md:min-w-[1180px]"
          >
            {manualPayments.map((submission) => (
              <tr key={submission.id} className="bg-background border border-border">
                <td className="px-3 py-3 text-sm text-foreground">{submission.orderNumber}</td>
                <td className="px-3 py-3 text-sm text-foreground-secondary">
                  <p>{submission.payerName}</p>
                  <p className="text-xs">{submission.phoneNumber}</p>
                </td>
                <td className="px-3 py-3 text-sm text-foreground-secondary">{submission.eventTitle}</td>
                <td className="px-3 py-3 text-sm text-foreground-secondary">{formatMoney(submission.currency, submission.amountPaid)}</td>
                <td className="px-3 py-3 text-sm text-foreground-secondary">{submission.transactionReference}</td>
                <td className="px-3 py-3 text-sm text-foreground-secondary">
                  {submission.screenshotUrl ? (
                    <a href={submission.screenshotUrl} target="_blank" rel="noreferrer" className="text-accent underline">
                      View
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-3 py-3 text-sm text-foreground-secondary">{formatDateTime(submission.submittedAt)}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="accent" disabled={reviewPending} onClick={() => void approve(submission.id)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={reviewPending} onClick={() => void reject(submission.id)}>
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </AdminSectionCard>

      {routeOrderId && (
        <AdminSectionCard title="Order Detail">
          {isSelectedLoading ? (
            <p className="text-sm text-foreground-secondary">Loading order details...</p>
          ) : !selectedOrder ? (
            <EmptyState title="Order not found" description="The selected order could not be loaded." />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="accent"
                  onClick={() => void issueTickets()}
                  disabled={
                    issueTicketsMutation.isPending ||
                    !["payment_verified", "paid"].includes(selectedOrder.status)
                  }
                >
                  {issueTicketsMutation.isPending
                    ? "Issuing..."
                    : selectedOrder.tickets.length > 0
                      ? "Reconcile Tickets"
                      : "Issue Tickets"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Order Number:</span> {selectedOrder.orderNumber}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Tracking Token:</span> {selectedOrder.publicToken}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Buyer:</span> {selectedOrder.buyer.buyerName}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Phone:</span> {selectedOrder.buyer.buyerPhone}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Email:</span> {selectedOrder.buyer.buyerEmail ?? "-"}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Event:</span> {selectedOrder.event.title}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Amount:</span> {formatMoney(selectedOrder.currency, selectedOrder.totalAmount)}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Order Status:</span> {selectedOrder.status}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Verification:</span> {selectedOrder.verificationStatus}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Reservation Expires:</span> {formatDateTime(selectedOrder.reservationExpiresAt)}
                </p>
              </div>

              {selectedOrder.latestPaymentProof && (
                <div className="border border-border rounded-md p-4 bg-secondary/15 text-sm text-foreground-secondary">
                  <p className="text-foreground mb-2">Latest Payment Proof</p>
                  <p>Method: {selectedOrder.latestPaymentProof.paymentMethod}</p>
                  <p>Payer: {selectedOrder.latestPaymentProof.payerName}</p>
                  <p>Phone: {selectedOrder.latestPaymentProof.phoneNumber}</p>
                  <p>Amount: {formatMoney(selectedOrder.currency, selectedOrder.latestPaymentProof.amountPaid)}</p>
                  <p>Reference: {selectedOrder.latestPaymentProof.transactionReference}</p>
                  <p>Submitted: {formatDateTime(selectedOrder.latestPaymentProof.submittedAt)}</p>
                  {selectedOrder.latestPaymentProof.screenshotUrl && (
                    <p>
                      Screenshot:{" "}
                      <a href={selectedOrder.latestPaymentProof.screenshotUrl} target="_blank" rel="noreferrer" className="text-accent underline">
                        View
                      </a>
                    </p>
                  )}
                </div>
              )}

              {selectedOrder.tickets.length > 0 && (
                <div className="border border-border rounded-md p-4 bg-secondary/15 text-sm text-foreground-secondary space-y-2">
                  <p className="text-foreground">Issued Tickets</p>
                  {selectedOrder.tickets.map((ticket) => (
                    <p key={ticket.publicTicketToken}>
                      {ticket.ticketNumber} · {ticket.ticketStatus} ·{" "}
                      <Link to={`/tickets/${ticket.publicTicketToken}`} className="text-accent underline">
                        Open
                      </Link>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </AdminSectionCard>
      )}
    </div>
  );
}
