import { useEffect, useMemo, useState } from "react";
import { QrCode, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/common/EmptyState";
import SectionHeader from "@/components/common/SectionHeader";
import StatusBadge from "@/components/common/StatusBadge";
import { mockBuyers, mockTicketTiers } from "@/data/mock";
import AdminSectionCard from "@/features/admin/shared/AdminSectionCard";
import { formatDateTime } from "@/features/admin/shared/utils";
import { useOrdersQuery } from "@/hooks/queries/useOrdersQuery";
import { useTicketsQuery } from "@/hooks/queries/useTicketsQuery";
import { useEventsQuery } from "@/hooks/queries/useEventsQuery";
import type { CheckInStatus, OrderRecord, TicketRecord } from "@/types/models";
import { toast } from "@/components/ui/sonner";

export default function AdminCheckInPage() {
  const { data: ticketsData, isLoading: isTicketsLoading, isError: hasTicketsError } = useTicketsQuery();
  const { data: ordersData } = useOrdersQuery();
  const { data: events } = useEventsQuery();

  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [query, setQuery] = useState("");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (ticketsData) setTickets(ticketsData);
  }, [ticketsData]);

  useEffect(() => {
    if (ordersData) setOrders(ordersData);
  }, [ordersData]);

  const buyerById = useMemo(() => Object.fromEntries(mockBuyers.map((buyer) => [buyer.id, buyer])), []);
  const tierById = useMemo(() => Object.fromEntries(mockTicketTiers.map((tier) => [tier.id, tier])), []);
  const eventById = useMemo(
    () => Object.fromEntries((events ?? []).map((event) => [event.id, event])),
    [events],
  );
  const orderById = useMemo(() => Object.fromEntries(orders.map((order) => [order.id, order])), [orders]);

  const activeTicket = useMemo(() => tickets.find((ticket) => ticket.id === activeTicketId) ?? null, [activeTicketId, tickets]);

  const activeDetails = useMemo(() => {
    if (!activeTicket) return null;
    return {
      ticket: activeTicket,
      order: orderById[activeTicket.orderId],
      buyer: buyerById[activeTicket.buyerId],
      tier: tierById[activeTicket.tierId],
      event: eventById[activeTicket.eventId],
    };
  }, [activeTicket, buyerById, eventById, orderById, tierById]);

  const searchTicket = () => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      toast.error("Enter ticket ID, order ID, buyer name, or phone.");
      return;
    }

    const matched = tickets.find((ticket) => {
      const order = orderById[ticket.orderId];
      const buyer = buyerById[ticket.buyerId];

      return (
        ticket.id.toLowerCase().includes(normalized) ||
        ticket.orderId.toLowerCase().includes(normalized) ||
        (order?.id.toLowerCase().includes(normalized) ?? false) ||
        (buyer?.name.toLowerCase().includes(normalized) ?? false) ||
        (buyer?.phone.toLowerCase().includes(normalized) ?? false)
      );
    });

    if (!matched) {
      setActiveTicketId(null);
      toast.error("No ticket found for this query.");
      return;
    }

    setActiveTicketId(matched.id);
    toast.success("Ticket loaded for check-in.");
  };

  const updateCheckIn = (ticketId: string, status: CheckInStatus) => {
    const checkedAt = status === "checked-in" ? new Date().toISOString() : undefined;

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              checkedInStatus: status,
              checkIn: {
                ...ticket.checkIn,
                checkedInAt: checkedAt,
                checkInMethod: status === "checked-in" ? "manual" : ticket.checkIn.checkInMethod,
              },
              updatedAt: new Date().toISOString(),
            }
          : ticket,
      ),
    );

    const ticket = tickets.find((item) => item.id === ticketId);
    if (!ticket) return;

    setOrders((current) =>
      current.map((order) =>
        order.id === ticket.orderId ? { ...order, checkedInStatus: status, updatedAt: new Date().toISOString() } : order,
      ),
    );
  };

  if (isTicketsLoading) {
    return <p className="text-sm text-foreground-secondary">Loading check-in data...</p>;
  }

  if (hasTicketsError) {
    return <EmptyState title="Could not load check-in data" description="Connect this section to backend ticket scanning endpoints." />;
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <SectionHeader title="Event Check-In" subtitle="Scan or manually search ticket records for fast event-day entry management." />

      <AdminSectionCard title="Scanner + Manual Search">
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-4">
          <div className="rounded-md border border-dashed border-border bg-secondary/20 p-6 text-center">
            <QrCode size={34} className="mx-auto text-foreground-secondary mb-3" />
            <p className="font-display text-sm text-foreground mb-1">QR Scanner Placeholder</p>
            <p className="text-xs text-foreground-secondary">Attach camera scanning here during backend integration.</p>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="block mb-1 text-[10px] font-display tracking-[0.16em] uppercase text-foreground-secondary">Search Ticket</span>
              <div className="flex items-center gap-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ticket ID, order ID, buyer name, or phone"
                  className="w-full border border-border bg-background text-foreground text-sm rounded-md px-3 py-2.5 font-body outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
                <Button type="button" variant="accent" onClick={searchTicket}>
                  <Search size={14} /> Search
                </Button>
              </div>
            </label>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Ticket Result">
        {!activeDetails && <EmptyState title="No ticket loaded" description="Search for a ticket to view check-in controls and details." />}

        {activeDetails && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <p className="text-foreground-secondary"><span className="text-foreground">Ticket ID:</span> {activeDetails.ticket.id}</p>
              <p className="text-foreground-secondary"><span className="text-foreground">Order ID:</span> {activeDetails.ticket.orderId}</p>
              <p className="text-foreground-secondary"><span className="text-foreground">Buyer:</span> {activeDetails.buyer?.name ?? "Unknown"}</p>
              <p className="text-foreground-secondary"><span className="text-foreground">Phone:</span> {activeDetails.buyer?.phone ?? "Unknown"}</p>
              <p className="text-foreground-secondary"><span className="text-foreground">Event:</span> {activeDetails.event?.title ?? "Unknown"}</p>
              <p className="text-foreground-secondary"><span className="text-foreground">Tier:</span> {activeDetails.tier?.name ?? "Unknown"}</p>
              <p className="text-foreground-secondary"><span className="text-foreground">Quantity:</span> {activeDetails.ticket.quantity}</p>
              <p className="text-foreground-secondary"><span className="text-foreground">Checked-In At:</span> {activeDetails.ticket.checkIn.checkedInAt ? formatDateTime(activeDetails.ticket.checkIn.checkedInAt) : "-"}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge
                tone={activeDetails.ticket.paymentStatus === "paid" ? "paid" : activeDetails.ticket.paymentStatus === "pending" ? "pending" : "failed"}
                label={`payment: ${activeDetails.ticket.paymentStatus}`}
              />
              <StatusBadge
                tone={activeDetails.ticket.checkedInStatus === "checked-in" ? "checked-in" : "draft"}
                label={activeDetails.ticket.checkedInStatus}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="accent" onClick={() => updateCheckIn(activeDetails.ticket.id, "checked-in")}>Mark Checked-In</Button>
              <Button type="button" variant="outline" onClick={() => updateCheckIn(activeDetails.ticket.id, "not-checked-in")}>Undo Check-In</Button>
              <Button type="button" variant="outline" onClick={() => { setQuery(""); setActiveTicketId(null); }}>
                <RotateCcw size={14} /> Search Another
              </Button>
            </div>
          </div>
        )}
      </AdminSectionCard>
    </div>
  );
}
