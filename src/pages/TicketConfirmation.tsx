import { Link, useParams } from "react-router-dom";
import { Download, QrCode, Share2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/common/PageHeader";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import { mockBuyers, mockEvents, mockOrders, mockTicketTiers } from "@/data/mock";
import { useTicketQuery } from "@/hooks/queries/useTicketQuery";
import { toast } from "@/components/ui/sonner";

export default function TicketConfirmation() {
  const { ticketId = "" } = useParams();
  const { data: ticket, isLoading, isError } = useTicketQuery(ticketId);

  if (isLoading) {
    return (
      <section className="section-padding">
        <div className="container-narrow">
          <p className="text-sm text-foreground-secondary">Loading ticket...</p>
        </div>
      </section>
    );
  }

  if (isError || !ticket) {
    return (
      <section className="section-padding">
        <div className="container-narrow">
          <EmptyState
            title="Ticket Not Found"
            description="No ticket record matches this link. Connect this route to backend ticket retrieval by ID."
            action={<Link to="/events" className="text-xs font-display tracking-[0.14em] uppercase text-accent">Back to Events</Link>}
          />
        </div>
      </section>
    );
  }

  const order = mockOrders.find((item) => item.id === ticket.orderId);
  const event = mockEvents.find((item) => item.id === ticket.eventId);
  const buyer = mockBuyers.find((item) => item.id === ticket.buyerId);
  const tier = mockTicketTiers.find((item) => item.id === ticket.tierId);

  return (
    <section className="section-padding">
      <div className="container-narrow">
        <PageHeader
          eyebrow="Ticket Confirmation"
          title="Your Ticket Is Ready"
          description="This confirmation page is backend-ready and can be populated with live order, payment, and ticket records."
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 md:gap-8">
          <article className="border border-border bg-card p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="font-display text-xl text-foreground">Ticket #{ticket.id}</h2>
              <StatusBadge tone={ticket.paymentStatus === "paid" ? "paid" : ticket.paymentStatus === "pending" ? "pending" : "failed"} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-foreground-secondary text-xs uppercase tracking-widest font-display mb-1">Event</p>
                <p className="text-foreground">{event?.title ?? "Unknown Event"}</p>
              </div>
              <div>
                <p className="text-foreground-secondary text-xs uppercase tracking-widest font-display mb-1">Date & Time</p>
                <p className="text-foreground">{event?.date ?? "-"} | {event?.time ?? "-"}</p>
              </div>
              <div>
                <p className="text-foreground-secondary text-xs uppercase tracking-widest font-display mb-1">Venue</p>
                <p className="text-foreground">{event?.venue ?? "Unknown Venue"}</p>
              </div>
              <div>
                <p className="text-foreground-secondary text-xs uppercase tracking-widest font-display mb-1">Buyer</p>
                <p className="text-foreground">{buyer?.name ?? "Unknown Buyer"}</p>
              </div>
              <div>
                <p className="text-foreground-secondary text-xs uppercase tracking-widest font-display mb-1">Tier</p>
                <p className="text-foreground">{tier?.name ?? "Unknown Tier"}</p>
              </div>
              <div>
                <p className="text-foreground-secondary text-xs uppercase tracking-widest font-display mb-1">Quantity</p>
                <p className="text-foreground">{ticket.quantity}</p>
              </div>
            </div>

            <div className="mt-6 rounded-md border border-border bg-secondary/20 p-4 flex items-center gap-3">
              <QrCode size={36} className="text-accent shrink-0" />
              <div>
                <p className="font-display text-sm text-foreground">QR Code Placeholder</p>
                <p className="text-xs text-foreground-secondary">{ticket.qrCodeValue}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="accent" size="sm" onClick={() => toast.success("Ticket download will be connected to backend file generation.")}>
                <Download size={14} /> Download Ticket
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.success("Share action placeholder ready for integration.")}>
                <Share2 size={14} /> Share Ticket
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.success("Confirmation resend queued (placeholder).")}>
                <Send size={14} /> Resend Confirmation
              </Button>
            </div>
          </article>

          <aside className="border border-border bg-secondary/15 p-5">
            <h3 className="font-display text-base text-foreground mb-3">Order Metadata</h3>
            <div className="space-y-2 text-xs text-foreground-secondary">
              <p>Order ID: {order?.id ?? "Unknown"}</p>
              <p>Payment Reference: {order?.paymentReference ?? "-"}</p>
              <p>Phone: {buyer?.phone ?? "-"}</p>
              <p>Delivery Status: {order?.ticketDeliveryStatus ?? "-"}</p>
              <p>Check-in Status: {order?.checkedInStatus ?? "-"}</p>
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
              <Link to="/events">Back to Events</Link>
            </Button>
          </aside>
        </div>
      </div>
    </section>
  );
}
