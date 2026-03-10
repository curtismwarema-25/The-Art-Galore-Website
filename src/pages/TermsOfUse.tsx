import PageHeader from "@/components/common/PageHeader";

export default function TermsOfUse() {
  return (
    <section className="section-padding">
      <div className="container-narrow max-w-3xl">
        <PageHeader
          eyebrow="Legal"
          title="Terms of Use"
          description="Terms and conditions for using Art Galore International services."
        />
        <div className="text-body space-y-5">
          <p>
            This is a legal UI placeholder prepared for backend and policy integration.
          </p>
          <p>
            Ticket availability, order verification, platform usage rights, and content submission
            responsibilities should be finalized with your legal team.
          </p>
          <p>
            Updated terms can be connected from admin-managed site settings links later.
          </p>
        </div>
      </div>
    </section>
  );
}
