import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import ScrollReveal from "@/components/ScrollReveal";
import EmptyState from "@/components/common/EmptyState";
import { usePersonQuery } from "@/hooks/queries/usePersonQuery";

export default function ArtistProfile() {
  const { slug = "" } = useParams();
  const { data: person, isLoading, isError } = usePersonQuery(slug);

  if (isLoading) {
    return (
      <section className="section-padding">
        <div className="container-narrow">
          <p className="text-sm text-foreground-secondary">Loading artist profile...</p>
        </div>
      </section>
    );
  }

  if (isError || !person || !person.isArtist) {
    return (
      <section className="section-padding">
        <div className="container-narrow">
          <EmptyState
            title="Artist Not Found"
            description="This artist profile is unavailable at the moment."
            action={
              <Link to="/artists" className="inline-flex items-center gap-2 text-accent font-display text-xs tracking-widest uppercase">
                <ArrowLeft size={14} /> Back to Artists
              </Link>
            }
          />
        </div>
      </section>
    );
  }

  const socialLinks = [
    person.socials.instagram ? { label: "Instagram", url: person.socials.instagram } : null,
    person.socials.x ? { label: "X", url: person.socials.x } : null,
    person.socials.website ? { label: "Website", url: person.socials.website } : null,
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <>
      <section className="section-padding">
        <div className="container-narrow">
          <Link
            to="/artists"
            className="inline-flex items-center gap-2 text-accent font-display text-xs tracking-widest uppercase mb-8 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={14} /> All Artists
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-start">
            <ScrollReveal>
              <img src={person.image} alt={person.name} className="w-full aspect-[4/5] object-cover" />
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="space-y-6">
                <div>
                  <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-2">
                    {person.category === "leadership" ? "Leadership Artist" : "Collective Artist"}
                  </p>
                  <h1 className="text-display-lg mb-2">{person.name}</h1>
                  <p className="font-display text-foreground-secondary">{person.role}</p>
                </div>

                <div className="text-body space-y-4">
                  <p>{person.bio}</p>
                </div>

                {socialLinks.length > 0 && (
                  <div>
                    <h3 className="font-display text-xs tracking-widest uppercase text-foreground-secondary mb-3">Socials</h3>
                    <div className="flex flex-wrap gap-2">
                      {socialLinks.map((social) => (
                        <a
                          key={social.label}
                          href={social.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-display border border-border text-foreground-secondary hover:text-accent transition-colors"
                        >
                          {social.label} <ExternalLink size={12} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-display text-xs tracking-widest uppercase text-foreground-secondary mb-3">Seen At</h3>
                  {person.eventsParticipated.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {person.eventsParticipated.map((event) => (
                        <span key={event} className="px-3 py-1.5 text-xs font-display border border-border text-foreground-secondary">
                          {event}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-foreground-secondary font-body">Event participation updates coming soon.</p>
                  )}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="section-padding pt-0">
        <div className="container-narrow">
          <ScrollReveal>
            <h2 className="text-display-md mb-8">Featured Works</h2>
          </ScrollReveal>
          {person.featuredWorks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {person.featuredWorks.map((work, i) => (
                <ScrollReveal key={work} delay={i * 0.06}>
                  <article className="border border-border bg-card px-5 py-6">
                    <p className="font-display text-sm text-foreground">{work}</p>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <ScrollReveal delay={0.04}>
              <p className="text-body">Featured works will be added soon.</p>
            </ScrollReveal>
          )}
        </div>
      </section>
    </>
  );
}
