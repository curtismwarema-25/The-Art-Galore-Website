import { Mail, Phone, MessageCircle } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { usePublicSiteSettingsQuery } from "@/hooks/queries/usePublicSiteSettingsQuery";

export default function Contact() {
  const { data: settings } = usePublicSiteSettingsQuery();
  const fallbackEmail = "theartgaloreintl@gmail.com";
  const fallbackPhone = "+254 759 292 496";
  const additionalPhones = ["+254 700 533 716", "+254 758 732 652"];

  const contactEmail = settings?.contactEmail?.trim() || fallbackEmail;
  const contactPhone = settings?.contactPhone?.trim() || fallbackPhone;
  const partnershipEmail = contactEmail || "theartgaloreintl@gmail.com";
  const whatsappNumbers = [contactPhone, ...additionalPhones];

  const contactMethods = [
    {
      icon: Mail,
      label: "Email",
      value: contactEmail,
      href: `mailto:${contactEmail}`,
    },
    {
      icon: Phone,
      label: "Phone",
      value: contactPhone,
      href: `tel:${contactPhone.replace(/\s+/g, "")}`,
    },
    ...additionalPhones.map((phone) => ({
      icon: Phone,
      label: "Phone",
      value: phone,
      href: `tel:${phone.replace(/\s+/g, "")}`,
    })),
  ] as const;

  return (
    <section className="section-padding pt-8 md:pt-12 lg:pt-16">
      <div className="container-narrow">
        <ScrollReveal>
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">Contact</p>
          <h1 className="editorial-display text-display-lg mb-5">{settings?.contactTitle || "Let's connect."}</h1>
          <p className="text-body-lg max-w-2xl mb-10">
            {settings?.contactIntro || "Have a question about an event, a ticket, a creative collaboration or something happening within our community? We would be glad to hear from you."}
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {contactMethods.map((item) => (
            <ScrollReveal key={`${item.label}-${item.value}`}>
              <a
                href={item.href}
                target={item.label === "WhatsApp" ? "_blank" : undefined}
                rel={item.label === "WhatsApp" ? "noreferrer" : undefined}
                className="block h-full rounded-md border border-border bg-card p-6 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
              >
                <div className="flex h-full flex-col">
                  <item.icon size={18} className="text-accent mb-4" />
                  <p className="font-display text-xs tracking-wider uppercase text-foreground-secondary mb-2">
                    {item.label}
                  </p>
                  <p className="font-display text-sm text-foreground break-words">{item.value}</p>
                </div>
              </a>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.06}>
          <div className="mt-6 border border-border bg-card p-6">
            <p className="font-display text-xs tracking-[0.25em] uppercase text-accent mb-4">WhatsApp</p>
            <div className="flex flex-wrap gap-3">
              {whatsappNumbers.map((phone) => {
                const international = phone.replace(/\s+/g, "");
                return <a key={phone} href={`https://wa.me/${international.replace(/^\+/, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-border px-4 py-3 text-sm hover:border-accent hover:text-accent"><MessageCircle size={16} />{phone}</a>;
              })}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="mt-10 border border-border p-8 bg-secondary/20">
            <p className="font-display text-xs tracking-[0.25em] uppercase text-accent mb-4">
              Partnership Inquiry
            </p>
            <p className="text-body mb-6">
              Want to collaborate with The Art Galore International? Send a short note and our team
              will follow up.
            </p>
            <Button variant="accent" size="lg" asChild>
              <a href={`mailto:${partnershipEmail}`}>Email Partnerships Team</a>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
