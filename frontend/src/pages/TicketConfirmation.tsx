import { Link, useParams } from "react-router-dom";
import { Download, QrCode, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/common/PageHeader";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import { useTicketQuery } from "@/hooks/queries/useTicketQuery";
import { getTicketDownloadUrl } from "@/api/endpoints/tickets";
import { toast } from "@/components/ui/sonner";

function ticketTone(status: string) {
  if (status === "active") return "paid";
  if (status === "checked_in") return "checked-in";
  return "failed";
}

export default function TicketConfirmation() {
  const { publicTicketToken = "" } = useParams();
  const { data: ticket, isLoading, isError } = useTicketQuery(publicTicketToken);
  const downloadUrl = ticket ? getTicketDownloadUrl(ticket.publicTicketToken) : "";

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
            description="No ticket record matches this link."
            action={<Link to="/events" className="text-xs font-display tracking-[0.14em] uppercase text-accent">Back to Events</Link>}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding">
      <div className="container-narrow">
        <PageHeader
          eyebrow="Ticket Confirmation"
          title="Your Ticket Is Ready"
          description="Present this QR code or ticket token at check-in."
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 md:gap-8">
          <article className="border border-border bg-card p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="font-display text-xl text-foreground">Ticket {ticket.ticketNumber}</h2>
              <StatusBadge tone={ticketTone(ticket.ticketStatus)} label={ticket.ticketStatus} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-foreground-secondary text-xs uppercase tracking-widest font-display mb-1">Event</p>
                <p className="text-foreground">{ticket.event.title}</p>
              </div>
              <div>
                <p className="text-foreground-secondary text-xs uppercase tracking-widest font-display mb-1">Date & Time</p>
                <p className="text-foreground">
                  {new Date(ticket.event.startAt).toLocaleString()} - {new Date(ticket.event.endAt).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <p className="text-foreground-secondary text-xs uppercase tracking-widest font-display mb-1">Venue</p>
                <p className="text-foreground">{ticket.event.venueName}</p>
              </div>
              <div>
                <p className="text-foreground-secondary text-xs uppercase tracking-widest font-display mb-1">Order</p>
                <p className="text-foreground">{ticket.order.orderNumber}</p>
              </div>
              <div>
                <p className="text-foreground-secondary text-xs uppercase tracking-widest font-display mb-1">Attendee</p>
                <p className="text-foreground">{ticket.attendeeName}</p>
              </div>
              <div>
                <p className="text-foreground-secondary text-xs uppercase tracking-widest font-display mb-1">Tier</p>
                <p className="text-foreground">{ticket.ticketTier.name}</p>
              </div>
              <div>
                <p className="text-foreground-secondary text-xs uppercase tracking-widest font-display mb-1">Issued At</p>
                <p className="text-foreground">{new Date(ticket.issuedAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-6 rounded-md border border-border bg-secondary/20 p-4">
              <div className="flex items-center gap-3 mb-3">
                <QrCode size={24} className="text-accent shrink-0" />
                <div>
                  <p className="font-display text-sm text-foreground">Ticket QR Code</p>
                  <p className="text-xs text-foreground-secondary">Use this for check-in verification.</p>
                </div>
              </div>
              <div className="rounded-md border border-border bg-background p-3 w-fit">
                <img src={ticket.qrCodeDataUrl} alt={`QR code for ${ticket.ticketNumber}`} className="h-48 w-48" />
              </div>
              <p className="mt-3 text-xs text-foreground-secondary break-all">Payload: {ticket.qrCodeValue}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="accent" size="sm" asChild>
                <a href={downloadUrl} target="_blank" rel="noreferrer">
                  <Download size={14} /> Download Ticket (PDF)
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const shareText = `Ticket ${ticket.ticketNumber} for ${ticket.event.title}`;
                  const ticketUrl = `${window.location.origin}/tickets/${ticket.publicTicketToken}`;

                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: "Art Galore Ticket",
                        text: shareText,
                        url: ticketUrl,
                      });
                    } catch {
                      // Ignore cancelled share action.
                    }
                    return;
                  }

                  try {
                    await navigator.clipboard.writeText(ticketUrl);
                    toast.success("Ticket link copied to clipboard.");
                  } catch {
                    toast.info("Share is unavailable on this browser. Copy this page URL manually.");
                  }
                }}
              >
                <Share2 size={14} /> Share Ticket
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.info("Keep this link safe. You can reopen and download your ticket at any time.")}>
                Keep Link Safe
              </Button>
            </div>
          </article>

          <aside className="border border-border bg-secondary/15 p-5">
            <h3 className="font-display text-base text-foreground mb-3">Ticket Metadata</h3>
            <div className="space-y-2 text-xs text-foreground-secondary">
              <p>Public Ticket Token: {ticket.publicTicketToken}</p>
              <p>Status: {ticket.ticketStatus}</p>
              <p>Checked-In At: {ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleString() : "-"}</p>
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
