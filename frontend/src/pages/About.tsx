import { useMemo } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { usePeopleQuery } from "@/hooks/queries/usePeopleQuery";
import { usePublicSiteSettingsQuery } from "@/hooks/queries/usePublicSiteSettingsQuery";

export default function About() {
  const { data: people = [], isLoading, isError } = usePeopleQuery();
  const { data: settings } = usePublicSiteSettingsQuery();

  const leadershipTeam = useMemo(
    () => people.filter((person) => person.category === "leadership").slice(0, 6),
    [people],
  );
  const collectiveMembers = useMemo(
    () => people.filter((person) => person.category === "member").slice(0, 12),
    [people],
  );

  if (isLoading && !settings) {
    return (
      <section className="section-padding">
        <div className="container-narrow">
          <p className="text-sm text-foreground-secondary">Loading About page...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding">
      <div className="container-narrow space-y-14">
        <ScrollReveal>
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">About</p>
                    <h1 className="editorial-display text-display-lg mb-6">{settings?.aboutTitle || "The Art Galore International"}</h1>
          <div className="max-w-4xl text-body space-y-5">
            <p className="text-body-lg">{settings?.aboutIntro || "A space for creativity, expression and community."}</p>
            {(settings?.aboutBody || "The Art Galore International is a creative community built around the appreciation, expression and experience of art.").split(/\n\s*\n/).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </ScrollReveal>

        {settings?.aboutImage && (
          <ScrollReveal delay={0.04}>
            <img src={settings.aboutImage} alt="Art Galore International" className="aspect-[16/7] w-full object-cover" />
          </ScrollReveal>
        )}

        <ScrollReveal delay={0.06}>
          <div>
            <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">
              Leadership / Organizing Team
            </p>
            {isError || leadershipTeam.length === 0 ? (
              <p className="text-sm text-foreground-secondary">No leadership profiles published yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {leadershipTeam.map((person) => (
                  <article
                    key={person.id}
                    className="border border-border bg-card p-5 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
                  >
                    <p className="font-display text-[10px] tracking-[0.2em] uppercase text-accent mb-2">
                      Leadership
                    </p>
                    <h3 className="font-display text-lg font-semibold text-foreground mb-1">{person.name}</h3>
                    <p className="font-body text-sm text-foreground-secondary">{person.role}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div>
            <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">
              Collective Members
            </p>
            <p className="text-body max-w-3xl mb-6">
              These members work hand in hand with the leadership team to organize and run events.
            </p>
            {isError || collectiveMembers.length === 0 ? (
              <p className="text-sm text-foreground-secondary">No member profiles published yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {collectiveMembers.map((person) => (
                  <article
                    key={person.id}
                    className="border border-border bg-card/70 px-4 py-3 transition-[border-color,transform] duration-300 hover:-translate-y-0.5"
                  >
                    <h3 className="font-display text-sm md:text-base text-foreground">{person.name}</h3>
                  </article>
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
