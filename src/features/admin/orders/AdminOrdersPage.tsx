import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmationBanner from "@/components/common/ConfirmationBanner";
import DataTable from "@/components/common/DataTable";
import EmptyState from "@/components/common/EmptyState";
import FilterBar from "@/components/common/FilterBar";
import SectionHeader from "@/components/common/SectionHeader";
import StatusBadge from "@/components/common/StatusBadge";
import AdminSectionCard from "@/features/admin/shared/AdminSectionCard";
import { formatMoney, formatDateTime } from "@/features/admin/shared/utils";
import { useAdminOrderQuery, useAdminOrdersQuery } from "@/hooks/queries/useAdminOrdersQuery";
import { useEventsQuery } from "@/hooks/queries/useEventsQuery";
import type { OrderLifecycleStatus } from "@/api/endpoints/orders";
import { toast } from "@/components/ui/sonner";

const PAYMENT_FILTER_OPTIONS: Array<{ label: string; value: "all" | OrderLifecycleStatus }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Failed", value: "failed" },
  { label: "Expired", value: "expired" },
  { label: "Refunded", value: "refunded" },
];

function paymentTone(status: OrderLifecycleStatus) {
  if (status === "paid") return "paid";
  if (status === "pending") return "pending";
  return "failed";
}

export default function AdminOrdersPage() {
  const { id: routeOrderId } = useParams();
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | OrderLifecycleStatus>("all");
  const [eventFilter, setEventFilter] = useState("all");

  const statusFilter = paymentFilter === "all" ? undefined : paymentFilter;
  const scopedEventId = eventFilter === "all" ? undefined : eventFilter;

  const { data: orders = [], isLoading, isError } = useAdminOrdersQuery({
    search: search.trim() || undefined,
    status: statusFilter,
    eventId: scopedEventId,
  });
  const { data: selectedOrder, isLoading: isSelectedLoading } = useAdminOrderQuery(routeOrderId ?? "");
  const { data: events = [] } = useEventsQuery();

  const eventOptions = useMemo(
    () => [{ label: "All Events", value: "all" }].concat(events.map((event) => ({ label: event.title, value: event.id }))),
    [events],
  );

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
        subtitle="Review ticket orders and payment lifecycle states."
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
              key: "payment",
              label: "Payment",
              value: paymentFilter,
              onChange: (value) => setPaymentFilter(value as "all" | OrderLifecycleStatus),
              options: PAYMENT_FILTER_OPTIONS,
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
            <DataTable
              headers={["Order", "Buyer", "Event", "Items", "Amount", "Payment", "Check-In", "Actions"]}
              minWidthClassName="min-w-[1040px]"
            >
              {orders.map((order) => (
                <tr key={order.id} className="bg-background border border-border">
                  <td className="px-3 py-3 text-sm text-foreground">{order.orderNumber}</td>
                  <td className="px-3 py-3 text-sm text-foreground-secondary">
                    <p>{order.buyer.fullName}</p>
                    <p className="text-xs">{order.buyer.phone}</p>
                  </td>
                  <td className="px-3 py-3 text-sm text-foreground-secondary">{order.event.title}</td>
                  <td className="px-3 py-3 text-sm text-foreground-secondary">
                    {order.items.map((item) => `${item.ticketTierName} x${item.quantity}`).join(", ")}
                  </td>
                  <td className="px-3 py-3 text-sm text-foreground-secondary">{formatMoney(order.currency, order.totalAmount)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge tone={paymentTone(order.status)} label={order.status} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge tone="draft" label="not-issued" />
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

      {routeOrderId && (
        <AdminSectionCard title="Order Detail">
          {isSelectedLoading ? (
            <p className="text-sm text-foreground-secondary">Loading order details...</p>
          ) : !selectedOrder ? (
            <EmptyState title="Order not found" description="The selected order could not be loaded." />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Order Number:</span> {selectedOrder.orderNumber}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Order ID:</span> {selectedOrder.id}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Payment Ref:</span> {selectedOrder.payment?.providerReference ?? "-"}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Payment Provider:</span> {selectedOrder.payment?.provider ?? "-"}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Buyer:</span> {selectedOrder.buyer.fullName}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Phone:</span> {selectedOrder.buyer.phone}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Email:</span> {selectedOrder.buyer.email ?? "-"}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Event:</span> {selectedOrder.event.title}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Items:</span>{" "}
                  {selectedOrder.items.map((item) => `${item.ticketTierName} x${item.quantity}`).join(", ")}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Amount:</span> {formatMoney(selectedOrder.currency, selectedOrder.totalAmount)}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Reservation Expires:</span> {formatDateTime(selectedOrder.reservationExpiresAt)}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Created:</span> {formatDateTime(selectedOrder.createdAt)}
                </p>
                <p className="text-foreground-secondary">
                  <span className="text-foreground">Updated:</span> {formatDateTime(selectedOrder.updatedAt)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="accent" onClick={() => toast.info("Ticket resend is not implemented in this pass.")}>
                  <Send size={14} /> Resend Ticket
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast.info("Manual payment status updates are not implemented in this pass.")}>
                  Mark Manually Paid
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast.info("Refund actions are not implemented in this pass.")}>
                  Mark Refunded
                </Button>
              </div>

              <ConfirmationBanner
                title="Read-Only Order Management"
                message="Order creation and payment lifecycle persistence are active. Ticket issuance/check-in and manual status transitions are in the next pass."
                tone="pending"
              />
            </div>
          )}
        </AdminSectionCard>
      )}
    </div>
  );
}
