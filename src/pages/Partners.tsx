import { Link } from "react-router-dom";
import { Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import PartnerLogoCard from "@/components/PartnerLogoCard";
import EmptyState from "@/components/common/EmptyState";
import { usePartnersQuery } from "@/hooks/queries/usePartnersQuery";

export default function Partners() {
  const { data: partners = [], isLoading, isError } = usePartnersQuery();

  return (
    <>
      <section className="section-padding pb-10">
        <div className="container-narrow">
          <ScrollReveal>
            <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">
              Partners & Collaborations
            </p>
            <h1 className="text-display-lg mb-5">Partners & Collaborations</h1>
            <p className="text-body-lg max-w-3xl">
              Art Galore International collaborates with artists, institutions, brands, and
              community organizations to create vibrant cultural experiences.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-padding pt-0">
        <div className="container-narrow">
          <ScrollReveal>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8">
              Our Partners
            </h2>
          </ScrollReveal>

          {isLoading && <p className="text-sm text-foreground-secondary">Loading partners...</p>}
          {isError && <EmptyState title="Could not load partners" description="Connect this view to backend partner endpoints." />}
          {!isLoading && !isError && partners.length === 0 && (
            <EmptyState title="No partners yet" description="Partner records will appear here once added." />
          )}

          {!isLoading && !isError && partners.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {partners.map((partner, i) => (
                <ScrollReveal key={partner.id} delay={i * 0.06}>
                  <PartnerLogoCard partner={partner} />
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section-padding bg-secondary/30">
        <div className="container-narrow">
          <ScrollReveal>
            <div className="border border-border bg-card p-8 md:p-12">
              <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">
                Become a Partner
              </p>
              <h2 className="text-display-md mb-4">Build Culture With Us</h2>
              <p className="text-body max-w-2xl mb-8">
                Partner with Art Galore International to co-create programs, sponsor events, and
                expand access to meaningful arts experiences across communities.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <Button variant="accent" size="lg" asChild>
                  <Link to="/contact" className="inline-flex items-center gap-2">
                    <Handshake size={16} /> Contact Partnerships
                  </Link>
                </Button>
                <a
                  href="mailto:partnerships@artgaloreinternational.org"
                  className="font-display text-xs tracking-widest uppercase text-foreground-secondary hover:text-accent transition-colors"
                >
                  partnerships@artgaloreinternational.org
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
