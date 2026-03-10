import PageHeader from "@/components/common/PageHeader";

export default function TicketRefundPolicy() {
  return (
    <section className="section-padding">
      <div className="container-narrow max-w-3xl">
        <PageHeader
          eyebrow="Legal"
          title="Ticket Refund Policy"
          description="Refund and cancellation guidance for event ticket purchases."
        />
        <div className="text-body space-y-5">
          <p>
            This placeholder page is ready for backend-linked policy management.
          </p>
          <p>
            Include cut-off timelines, transfer rules, no-show handling, and approved refund
            channels when final policy language is available.
          </p>
          <p>
            Once payments are integrated, order-level refund actions can be linked from the admin
            ticket management workflow.
          </p>
        </div>
      </div>
    </section>
  );
}
