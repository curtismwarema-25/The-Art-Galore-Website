import PageHeader from "@/components/common/PageHeader";

export default function TicketRefundPolicy() {
  return (
    <section className="section-padding">
      <div className="container-narrow max-w-3xl">
        <PageHeader
          eyebrow="Legal"
          title="Ticket Refund Policy"
          description="Refund and cancellation terms are being prepared for owner approval."
        />
        <div className="text-body space-y-5"><p role="status">Ticket refund and cancellation policy content is pending review and approval by Art Galore International. Contact the event team before purchasing if you need clarification.</p></div>
      </div>
    </section>
  );
}
