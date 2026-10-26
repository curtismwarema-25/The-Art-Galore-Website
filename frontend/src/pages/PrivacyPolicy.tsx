import PageHeader from "@/components/common/PageHeader";

export default function PrivacyPolicy() {
  return (
    <section className="section-padding">
      <div className="container-narrow max-w-3xl">
        <PageHeader
          eyebrow="Legal"
          title="Privacy Policy"
          description="This policy is being prepared for owner approval."
        />
        <div className="text-body space-y-5"><p role="status">Privacy policy content is pending review and approval by Art Galore International. Please contact the organization with privacy questions before submitting personal information.</p></div>
      </div>
    </section>
  );
}
