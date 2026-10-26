import PageHeader from "@/components/common/PageHeader";

export default function TermsOfUse() {
  return (
    <section className="section-padding">
      <div className="container-narrow max-w-3xl">
        <PageHeader
          eyebrow="Legal"
          title="Terms of Use"
          description="These terms are being prepared for owner approval."
        />
        <div className="text-body space-y-5"><p role="status">Terms of use content is pending review and approval by Art Galore International. No terms have been published on this page yet.</p></div>
      </div>
    </section>
  );
}
