import { Mail, Phone, MessageCircle } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";

export default function Contact() {
  return (
    <section className="section-padding">
      <div className="container-narrow">
        <ScrollReveal>
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">Contact</p>
          <h1 className="text-display-lg mb-5">Contact Art Galore International</h1>
          <p className="text-body-lg max-w-2xl mb-10">
            Reach out for event inquiries, artist opportunities, media requests, or partnerships.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: Mail,
              label: "Email",
              value: "hello@artgaloreinternational.org",
              href: "mailto:hello@artgaloreinternational.org",
            },
            {
              icon: Phone,
              label: "Phone",
              value: "+254 700 000 000",
              href: "tel:+254700000000",
            },
            {
              icon: MessageCircle,
              label: "WhatsApp",
              value: "+254 711 000 000",
              href: "https://wa.me/254711000000",
            },
          ].map((item) => (
            <ScrollReveal key={item.label}>
              <a
                href={item.href}
                target={item.label === "WhatsApp" ? "_blank" : undefined}
                rel={item.label === "WhatsApp" ? "noreferrer" : undefined}
                className="border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_32px_-20px_hsl(var(--foreground)/0.35)]"
              >
                <item.icon size={18} className="text-accent mb-4" />
                <p className="font-display text-xs tracking-wider uppercase text-foreground-secondary mb-2">
                  {item.label}
                </p>
                <p className="font-display text-sm text-foreground">{item.value}</p>
              </a>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.1}>
          <div className="mt-10 border border-border p-8 bg-secondary/20">
            <p className="font-display text-xs tracking-[0.25em] uppercase text-accent mb-4">
              Partnership Inquiry
            </p>
            <p className="text-body mb-6">
              Want to collaborate with Art Galore International? Send a short note and our team
              will follow up.
            </p>
            <Button variant="accent" size="lg" asChild>
              <a href="mailto:partnerships@artgaloreinternational.org">Email Partnerships Team</a>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
