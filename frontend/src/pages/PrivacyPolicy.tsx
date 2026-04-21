import PageHeader from "@/components/common/PageHeader";

export default function PrivacyPolicy() {
  return (
    <section className="section-padding">
      <div className="container-narrow max-w-3xl">
        <PageHeader
          eyebrow="Legal"
          title="Privacy Policy"
          description="How Art Galore International collects, uses, and protects user data."
        />
        <div className="text-body space-y-5">
          <p>
            This page is a backend-ready legal placeholder. Replace this copy with your approved
            legal privacy text before launch.
          </p>
          <p>
            Art Galore International may collect contact and transaction details to process ticket
            purchases, event participation, and communication requests.
          </p>
          <p>
            Data retention, third-party processing, and consent management details should be updated
            when backend services are connected.
          </p>
        </div>
      </div>
    </section>
  );
}
