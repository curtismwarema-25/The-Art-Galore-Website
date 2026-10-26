import { Fragment, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronDown, ChevronUp, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/common/DataTable";
import EmptyState from "@/components/common/EmptyState";
import FilterBar from "@/components/common/FilterBar";
import SectionHeader from "@/components/common/SectionHeader";
import StatusBadge from "@/components/common/StatusBadge";
import AdminSectionCard from "@/features/admin/shared/AdminSectionCard";
import { formatDateTime, formatMoney } from "@/features/admin/shared/utils";
import { useIssueTicketsMutation } from "@/hooks/mutations/useIssueTicketsMutation";
import { useApproveManualPaymentMutation, useRejectManualPaymentMutation, useReverifyMpesaTransactionMutation } from "@/hooks/mutations/usePaymentMutations";
import { useResendTicketEmailDeliveryMutation } from "@/hooks/mutations/useTicketEmailDeliveryMutation";
import { useAdminManualPaymentsQuery } from "@/hooks/queries/useAdminManualPaymentsQuery";
import { useAdminMpesaTransactionsQuery } from "@/hooks/queries/useAdminMpesaTransactionsQuery";
import { useAdminOrderQuery, useAdminOrdersQuery } from "@/hooks/queries/useAdminOrdersQuery";
import { useAdminTicketEmailDeliveryQuery } from "@/hooks/queries/useAdminTicketEmailDeliveryQuery";
import { useEventsQuery } from "@/hooks/queries/useEventsQuery";
import type { AdminMpesaTransactionAuditRecord, AdminMpesaTransactionStatus } from "@/api/endpoints/payments";
import type { OrderDetailsRecord, OrderLifecycleStatus, TicketDeliveryStatus } from "@/api/endpoints/orders";
import type { TicketEmailDeliverySummaryRecord } from "@/api/endpoints/tickets";
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

const MPESA_STATUS_FILTER_OPTIONS: Array<{ label: string; value: "all" | AdminMpesaTransactionStatus }> = [
  { label: "All", value: "all" },
  { label: "Initiated", value: "initiated" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Failed", value: "failed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Refunded", value: "refunded" },
];

function orderStatusTone(status: OrderLifecycleStatus) {
  if (status === "paid" || status === "payment_verified") return "paid";
  if (status === "payment_rejected" || status === "expired") return "rejected";
  return "pending";
}

function verificationTone(status: "not_submitted" | "pending_review" | "approved" | "rejected") {
  if (status === "not_submitted") return "pending" as const;
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "pending";
}

function mpesaStatusTone(status: AdminMpesaTransactionStatus) {
  if (status === "paid") return "paid" as const;
  if (status === "initiated") return "initiating" as const;
  if (status === "pending") return "pending" as const;
  return "failed" as const;
}

function ticketDeliveryTone(status: TicketDeliveryStatus) {
  if (status === "sent") return "paid" as const;
  if (status === "failed") return "failed" as const;
  return "pending" as const;
}

function compactReference(value?: string) {
  if (!value) return "-";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function formatCallback(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Raw callback could not be displayed.";
  }
}

type ReviewModalState = {
  submissionId: string;
  orderNumber: string;
  action: "approve" | "reject";
} | null;

function buildOrderTimeline(
  order: OrderDetailsRecord,
  mpesaTransactions: AdminMpesaTransactionAuditRecord[] | undefined,
  ticketDelivery: TicketEmailDeliverySummaryRecord | undefined,
) {
  const events: Array<{ at: string; label: string; detail: string }> = [
    {
      at: order.placedAt,
      label: "Order created",
      detail: `${order.buyer.buyerName} reserved ${order.items.reduce((sum, item) => sum + item.quantity, 0)} ticket(s).`,
    },
  ];

  for (const transaction of mpesaTransactions ?? []) {
    events.push({
      at: transaction.initiatedAt,
      label: "M-Pesa STK attempt",
      detail: `${transaction.status}${transaction.resultCode ? ` (${transaction.resultCode})` : ""}`,
    });
    if (transaction.completedAt) {
      events.push({
        at: transaction.completedAt,
        label: "M-Pesa result",
        detail: transaction.resultDesc ?? transaction.status,
      });
    }
  }

  if (order.latestPaymentProof) {
    events.push({
      at: order.latestPaymentProof.submittedAt,
      label: "Payment proof submitted",
      detail: `${order.latestPaymentProof.paymentMethod} reference ${order.latestPaymentProof.transactionReference}`,
    });
    if (order.latestPaymentProof.reviewedAt) {
      events.push({
        at: order.latestPaymentProof.reviewedAt,
        label: "Payment proof reviewed",
        detail: order.latestPaymentProof.verificationNote ?? order.latestPaymentProof.verificationStatus,
      });
    }
  }

  if (order.paidAt) {
    events.push({ at: order.paidAt, label: "Order paid", detail: `${order.tickets.length} issued ticket(s).` });
  }

  for (const ticket of order.tickets) {
    events.push({ at: ticket.issuedAt, label: "Ticket issued", detail: ticket.ticketNumber });
    if (ticket.checkedInAt) {
      events.push({ at: ticket.checkedInAt, label: "Ticket checked in", detail: ticket.ticketNumber });
    }
  }

  for (const attempt of ticketDelivery?.attempts ?? []) {
    events.push({
      at: attempt.completedAt ?? attempt.createdAt,
      label: "Ticket email delivery",
      detail: attempt.messageId ?? attempt.errorSummary ?? attempt.status,
    });
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export default function AdminOrdersPage() {
  const { id: routeOrderId } = useParams();
  const [search, setSearch] = useState("");
  const [statusFilterValue, setStatusFilterValue] = useState<"all" | OrderLifecycleStatus>("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [mpesaSearch, setMpesaSearch] = useState("");
  const [mpesaStatusFilterValue, setMpesaStatusFilterValue] = useState<"all" | AdminMpesaTransactionStatus>("all");
  const [expandedMpesaTransactionId, setExpandedMpesaTransactionId] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<ReviewModalState>(null);
  const [reviewNote, setReviewNote] = useState("");

  const statusFilter = statusFilterValue === "all" ? undefined : statusFilterValue;
  const scopedEventId = eventFilter === "all" ? undefined : eventFilter;
  const mpesaStatusFilter = mpesaStatusFilterValue === "all" ? undefined : mpesaStatusFilterValue;

  const { data: orders = [], isLoading, isError } = useAdminOrdersQuery({
    search: search.trim() || undefined,
    status: statusFilter,
    eventId: scopedEventId,
  });
  const { data: selectedOrder, isLoading: isSelectedLoading } = useAdminOrderQuery(routeOrderId ?? "");
  const {
    data: ticketDelivery,
    isLoading: isTicketDeliveryLoading,
    isError: isTicketDeliveryError,
  } = useAdminTicketEmailDeliveryQuery(routeOrderId ?? "");
  const { data: manualPayments = [], isLoading: isManualPaymentsLoading } = useAdminManualPaymentsQuery({
    verificationStatus: "pending_review",
    search: search.trim() || undefined,
    orderId: routeOrderId,
  });
  const {
    data: mpesaTransactions = [],
    isLoading: isMpesaTransactionsLoading,
    isError: isMpesaTransactionsError,
  } = useAdminMpesaTransactionsQuery({
    search: mpesaSearch.trim() || undefined,
    status: mpesaStatusFilter,
    orderId: routeOrderId,
    limit: 100,
  });
  const { data: events = [] } = useEventsQuery();
  const approveMutation = useApproveManualPaymentMutation();
  const rejectMutation = useRejectManualPaymentMutation();
  const reverifyMpesaMutation = useReverifyMpesaTransactionMutation();
  const issueTicketsMutation = useIssueTicketsMutation();
  const resendTicketEmailMutation = useResendTicketEmailDeliveryMutation();

  const eventOptions = useMemo(
    () => [{ label: "All Events", value: "all" }].concat(events.map((event) => ({ label: event.title, value: event.id }))),
    [events],
  );

  const reviewPending = approveMutation.isPending || rejectMutation.isPending;

  const openReviewModal = (submissionId: string, orderNumber: string, action: "approve" | "reject") => {
    setReviewModal({ submissionId, orderNumber, action });
    setReviewNote("");
  };

  const submitReview = async () => {
    if (!reviewModal) return;
    const note = reviewNote.trim() || undefined;
    try {
      if (reviewModal.action === "approve") {
        const result = await approveMutation.mutateAsync({
          id: reviewModal.submissionId,
          verificationNote: note,
        });
        toast.success(`Payment approved for ${result.orderNumber}. ${result.ticketsIssued} ticket(s) issued.`);
      } else {
        const result = await rejectMutation.mutateAsync({
          id: reviewModal.submissionId,
          verificationNote: note,
        });
        toast.success(`Payment rejected for ${result.orderNumber}.`);
      }
      setReviewModal(null);
      setReviewNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not review payment.");
    }
  };

  const reverifyMpesaTransaction = async (transactionId: string) => {
    try {
      const result = await reverifyMpesaMutation.mutateAsync(transactionId);
      toast.success(`M-Pesa verification refreshed for ${result.orderNumber}: ${result.status}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reverify M-Pesa transaction.");
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

  const resendTicketEmail = async () => {
    if (!selectedOrder) return;

    try {
      const result = await resendTicketEmailMutation.mutateAsync(selectedOrder.id);
      if (result.ticketDeliveryStatus === "sent") {
        toast.success(`Ticket email sent for ${result.orderNumber}.`);
        return;
      }

      toast.error(result.lastError ?? "Ticket email delivery failed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend ticket email.");
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
                    <Button size="sm" variant="accent" disabled={reviewPending} onClick={() => openReviewModal(submission.id, submission.orderNumber, "approve")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={reviewPending} onClick={() => openReviewModal(submission.id, submission.orderNumber, "reject")}>
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </AdminSectionCard>

      <AdminSectionCard title="M-Pesa Transactions">
        <FilterBar
          searchValue={mpesaSearch}
          onSearchChange={setMpesaSearch}
          searchPlaceholder="Search order, phone, receipt, checkout, or merchant request"
          filters={[
            {
              key: "mpesaStatus",
              label: "Payment Status",
              value: mpesaStatusFilterValue,
              onChange: (value) => setMpesaStatusFilterValue(value as "all" | AdminMpesaTransactionStatus),
              options: MPESA_STATUS_FILTER_OPTIONS,
            },
          ]}
        />

        {routeOrderId && (
          <p className="mt-3 text-xs text-foreground-secondary">
            Showing M-Pesa transactions for the selected order detail.
          </p>
        )}

        <div className="mt-4">
          {isMpesaTransactionsLoading ? (
            <p className="text-sm text-foreground-secondary">Loading M-Pesa transactions...</p>
          ) : isMpesaTransactionsError ? (
            <EmptyState title="Could not load M-Pesa transactions" description="Check the admin payment audit endpoint and auth session." />
          ) : mpesaTransactions.length === 0 ? (
            <EmptyState title="No M-Pesa transactions match filters" description="New STK payment attempts will appear here." />
          ) : (
            <DataTable
              headers={["Order", "Buyer Phone", "Amount", "Status", "Checkout Request", "M-Pesa Receipt", "Result", "Timeline", "Details"]}
              minWidthClassName="min-w-[980px] md:min-w-[1240px]"
            >
              {mpesaTransactions.map((transaction) => {
                const isExpanded = expandedMpesaTransactionId === transaction.id;
                return (
                  <Fragment key={transaction.id}>
                    <tr className="bg-background border border-border">
                      <td className="px-3 py-3 text-sm text-foreground">{transaction.orderNumber}</td>
                      <td className="px-3 py-3 text-sm text-foreground-secondary">{transaction.buyerPhone}</td>
                      <td className="px-3 py-3 text-sm text-foreground-secondary">
                        {formatMoney(transaction.currency, transaction.amount)}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge tone={mpesaStatusTone(transaction.status)} label={transaction.status} />
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground-secondary" title={transaction.checkoutRequestId}>
                        {compactReference(transaction.checkoutRequestId)}
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground-secondary" title={transaction.externalTransactionId}>
                        {transaction.externalTransactionId ?? "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground-secondary max-w-[210px]">
                        <p className="text-foreground">{transaction.resultCode ?? "-"}</p>
                        <p className="truncate text-xs" title={transaction.resultDesc}>
                          {transaction.resultDesc ?? "No result message"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-xs text-foreground-secondary">
                        <p>Started {formatDateTime(transaction.initiatedAt)}</p>
                        <p>{transaction.completedAt ? `Completed ${formatDateTime(transaction.completedAt)}` : "Awaiting callback"}</p>
                        <p>{transaction.callbackReceived ? "Callback received" : "No callback yet"}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedMpesaTransactionId(isExpanded ? null : transaction.id)}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {isExpanded ? "Hide" : "View"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reverifyMpesaMutation.isPending || !["initiated", "pending"].includes(transaction.status)}
                            onClick={() => void reverifyMpesaTransaction(transaction.id)}
                          >
                            <RefreshCw size={14} />
                            Reverify
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-background border border-border">
                        <td colSpan={9} className="px-3 pb-4 text-sm text-foreground-secondary">
                          <div className="rounded-md border border-border bg-secondary/15 p-4">
                            <div className="grid gap-3 md:grid-cols-3">
                              <p>
                                <span className="text-foreground">Merchant Request:</span>{" "}
                                {transaction.merchantRequestId ?? "-"}
                              </p>
                              <p>
                                <span className="text-foreground">Checkout Request:</span>{" "}
                                {transaction.checkoutRequestId ?? "-"}
                              </p>
                              <p>
                                <span className="text-foreground">Callback:</span>{" "}
                                {transaction.callbackReceived ? "received" : "not received"}
                              </p>
                            </div>
                            {transaction.resultDesc && (
                              <p className="mt-3">
                                <span className="text-foreground">Result Message:</span> {transaction.resultDesc}
                              </p>
                            )}
                            {transaction.rawCallback !== undefined && (
                              <pre className="mt-3 max-h-72 overflow-auto rounded-md border border-border bg-background p-3 text-xs text-foreground-secondary">
                                {formatCallback(transaction.rawCallback)}
                              </pre>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </DataTable>
          )}
        </div>
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

              <div className="border border-border rounded-md p-4 bg-secondary/15 text-sm text-foreground-secondary space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-foreground mb-2 flex items-center gap-2">
                      <Mail size={15} />
                      Ticket Email Delivery
                    </p>
                    {ticketDelivery && (
                      <StatusBadge
                        tone={ticketDeliveryTone(ticketDelivery.ticketDeliveryStatus)}
                        label={ticketDelivery.ticketDeliveryStatus}
                      />
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void resendTicketEmail()}
                    disabled={
                      resendTicketEmailMutation.isPending ||
                      isTicketDeliveryLoading ||
                      !ticketDelivery?.canResend
                    }
                  >
                    <RefreshCw size={14} />
                    {resendTicketEmailMutation.isPending ? "Resending..." : "Resend Email"}
                  </Button>
                </div>

                {isTicketDeliveryLoading ? (
                  <p>Loading ticket email delivery...</p>
                ) : isTicketDeliveryError ? (
                  <p>Could not load ticket email delivery.</p>
                ) : ticketDelivery ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <p>
                        <span className="text-foreground">Attempts:</span>{" "}
                        {ticketDelivery.attemptCount}/{ticketDelivery.maxAttempts}
                      </p>
                      <p>
                        <span className="text-foreground">Last Attempt:</span>{" "}
                        {ticketDelivery.lastAttemptAt ? formatDateTime(ticketDelivery.lastAttemptAt) : "-"}
                      </p>
                      <p>
                        <span className="text-foreground">Next Retry:</span>{" "}
                        {ticketDelivery.nextRetryAt ? formatDateTime(ticketDelivery.nextRetryAt) : "-"}
                      </p>
                      <p>
                        <span className="text-foreground">Recipient:</span>{" "}
                        {selectedOrder.buyer.buyerEmail ?? "-"}
                      </p>
                    </div>

                    {ticketDelivery.lastError && (
                      <p>
                        <span className="text-foreground">Last Error:</span> {ticketDelivery.lastError}
                      </p>
                    )}

                    {ticketDelivery.attempts.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-[680px] w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-border text-foreground">
                              <th className="py-2 pr-3 font-medium">When</th>
                              <th className="py-2 pr-3 font-medium">Trigger</th>
                              <th className="py-2 pr-3 font-medium">Status</th>
                              <th className="py-2 pr-3 font-medium">Recipient</th>
                              <th className="py-2 pr-3 font-medium">Message</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ticketDelivery.attempts.map((attempt) => (
                              <tr key={attempt.id} className="border-b border-border/70">
                                <td className="py-2 pr-3">{formatDateTime(attempt.completedAt ?? attempt.createdAt)}</td>
                                <td className="py-2 pr-3">{attempt.trigger}</td>
                                <td className="py-2 pr-3">
                                  <StatusBadge
                                    tone={attempt.status === "sent" ? "paid" : attempt.status === "failed" ? "failed" : "pending"}
                                    label={attempt.status}
                                  />
                                </td>
                                <td className="py-2 pr-3">{attempt.recipient ?? "-"}</td>
                                <td className="py-2 pr-3">
                                  {attempt.messageId ?? attempt.errorSummary ?? "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p>No ticket email attempts yet.</p>
                    )}
                  </>
                ) : null}
              </div>

              <div className="border border-border rounded-md p-4 bg-secondary/15 text-sm text-foreground-secondary">
                <p className="text-foreground mb-3">Order Timeline</p>
                <div className="space-y-3">
                  {buildOrderTimeline(selectedOrder, mpesaTransactions, ticketDelivery).map((item, index) => (
                    <div key={`${item.at}-${item.label}-${index}`} className="grid gap-1 border-b border-border/70 pb-3 last:border-0 last:pb-0 md:grid-cols-[180px_1fr]">
                      <p className="text-xs text-foreground-secondary">{formatDateTime(item.at)}</p>
                      <div>
                        <p className="text-foreground">{item.label}</p>
                        <p>{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
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

      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 px-4">
          <div className="w-full max-w-lg rounded-md border border-border bg-card p-5 shadow-lg">
            <p className="font-display text-lg text-foreground">
              {reviewModal.action === "approve" ? "Approve Payment" : "Reject Payment"}
            </p>
            <p className="mt-1 text-sm text-foreground-secondary">
              Order {reviewModal.orderNumber}
            </p>
            <label className="mt-4 block">
              <span className="text-xs uppercase tracking-[0.12em] text-foreground-secondary">Review note</span>
              <textarea
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                className="mt-2 min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                placeholder={reviewModal.action === "approve" ? "Optional internal approval note" : "Reason visible to the operations team"}
              />
            </label>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button type="button" size="sm" variant="outline" disabled={reviewPending} onClick={() => setReviewModal(null)}>
                Cancel
              </Button>
              <Button type="button" size="sm" variant={reviewModal.action === "approve" ? "accent" : "outline"} disabled={reviewPending} onClick={() => void submitReview()}>
                {reviewPending ? "Saving..." : reviewModal.action === "approve" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
