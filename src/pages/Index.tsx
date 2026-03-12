import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Calendar, Clock, MapPin, MessageCircle } from "lucide-react";
import ParallaxText from "@/components/ParallaxText";
import PartnerLogoCard from "@/components/PartnerLogoCard";
import ScrollReveal from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { useEventsQuery } from "@/hooks/queries/useEventsQuery";
import { useGalleryQuery } from "@/hooks/queries/useGalleryQuery";
import { usePartnersQuery } from "@/hooks/queries/usePartnersQuery";
import { usePeopleQuery } from "@/hooks/queries/usePeopleQuery";
import { usePublicSiteSettingsQuery } from "@/hooks/queries/usePublicSiteSettingsQuery";
import type { EventRecord, PartnerRecord, PersonRecord } from "@/types/models";
import { formInputClassName, formLabelClassName } from "@/lib/formStyles";

import heroImg from "@/assets/hero-art-event.jpg";
import paintingShot from "@/assets/painting-shot.heic";
import paintingShot2 from "@/assets/painting-shot-2.heic";
import paintingShot3 from "@/assets/painting-shot-3.heic";
import paintingShot4 from "@/assets/painting-shot-4.heic";

const eventTypes = [
  {
    title: "Sip & Paint",
    desc: "Wine, canvas, and good company. An evening of guided painting in an intimate setting.",
    img: paintingShot,
  },
  {
    title: "Art Night",
    desc: "Gallery walks, live art, poetry, and music. A curated cultural experience.",
    img: paintingShot2,
  },
  {
    title: "Pajama Night",
    desc: "Come as you are. Art-making in comfort - a creative sanctuary in sleepwear.",
    img: paintingShot3,
  },
];

function HeroSection({ heroTitle, heroSubtitle }: { heroTitle: string; heroSubtitle: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={ref} className="relative h-screen min-h-[600px] overflow-hidden">
      <motion.div style={{ y: heroY }} className="absolute inset-0 -top-12">
        <img src={heroImg} alt="Immersive art event" className="w-full h-[120%] object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </motion.div>

      <div className="absolute top-24 right-8 md:right-16 w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-accent/30 opacity-60" />
      <div className="absolute bottom-32 left-8 md:left-16 w-8 h-32 bg-accent/10" />

      <motion.div style={{ y: textY, opacity }} className="relative z-10 h-full flex flex-col justify-end pb-16 md:pb-24 px-4 md:px-8 lg:px-16">
        <div className="container-narrow w-full">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="font-display text-xs tracking-[0.3em] uppercase mb-4 text-accent"
          >
            The Art Galore International
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-display-xl text-foreground mb-6 max-w-4xl"
          >
            {heroTitle}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-body-lg max-w-md mb-8"
          >
            {heroSubtitle}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="flex flex-wrap gap-4"
          >
            <Button variant="accent" size="lg" asChild>
              <Link to="/events">Buy Tickets</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/gallery">View Gallery</Link>
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

function UpcomingEventSection({ upcomingEvent }: { upcomingEvent?: EventRecord }) {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal>
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">Coming Up</p>
          <h2 className="text-display-lg mb-12">Next Event</h2>
        </ScrollReveal>

        {!upcomingEvent ? (
          <ScrollReveal delay={0.1}>
            <div className="border border-border bg-card p-6">
              <p className="text-sm text-foreground-secondary">No upcoming events are available yet.</p>
            </div>
          </ScrollReveal>
        ) : (
          <ScrollReveal delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="overflow-hidden">
                <img src={upcomingEvent.heroImage || paintingShot} alt={upcomingEvent.title} className="w-full aspect-[4/5] object-cover hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="font-display text-6xl md:text-7xl font-bold text-foreground leading-none">{new Date(upcomingEvent.startAt).getDate()}</p>
                  <p className="font-display text-xl text-foreground-secondary">{upcomingEvent.date}</p>
                </div>
                <h3 className="text-display-md">{upcomingEvent.title}</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-body">
                    <Clock size={16} className="text-accent shrink-0" />
                    <span>{upcomingEvent.time}</span>
                  </div>
                  <div className="flex items-center gap-3 text-body">
                    <MapPin size={16} className="text-accent shrink-0" />
                    <span>{upcomingEvent.venue}</span>
                  </div>
                  <div className="flex items-center gap-3 text-body">
                    <Calendar size={16} className="text-accent shrink-0" />
                    <span>Limited to {upcomingEvent.capacity} guests</span>
                  </div>
                </div>
                <Button variant="accent" size="lg" asChild>
                  <Link to={`/events/${upcomingEvent.slug}`} className="inline-flex items-center gap-2">
                    Get Tickets <ArrowRight size={16} />
                  </Link>
                </Button>
              </div>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
}

function JoinCommunitySection({ whatsappLink }: { whatsappLink: string }) {
  return (
    <section className="section-padding bg-secondary/20">
      <div className="container-narrow">
        <ScrollReveal>
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">Join the Community</p>
          <h2 className="text-display-lg mb-4">Grow With The Collective</h2>
          <p className="text-body-lg max-w-3xl mb-8">
            Stay connected to upcoming events, artist opportunities, and collaborative cultural moments.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <ScrollReveal>
            <article className="border border-border bg-card p-5">
              <h3 className="font-display text-lg mb-2">WhatsApp Community</h3>
              <p className="text-sm text-foreground-secondary mb-4">Get real-time event updates and ticket alerts.</p>
              <Button variant="accent" size="sm" asChild>
                <a href={whatsappLink} target="_blank" rel="noreferrer">
                  <MessageCircle size={14} /> Join WhatsApp
                </a>
              </Button>
            </article>
          </ScrollReveal>
          <ScrollReveal delay={0.06}>
            <article className="border border-border bg-card p-5">
              <h3 className="font-display text-lg mb-2">Newsletter Signup</h3>
              <p className="text-sm text-foreground-secondary mb-4">Receive curated event news and archive drops.</p>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  toast.success("Newsletter signup captured. Backend hook pending.");
                }}
              >
                <label className={formLabelClassName}>Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={formInputClassName}
                  required
                />
                <Button type="submit" variant="outline" size="sm" className="w-full">Subscribe</Button>
              </form>
            </article>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <article className="border border-border bg-card p-5">
              <h3 className="font-display text-lg mb-2">Artist Submission</h3>
              <p className="text-sm text-foreground-secondary mb-4">Submit your artist profile and portfolio for future programs.</p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/contact">Submit as Artist</Link>
              </Button>
            </article>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

function PastArchivePreviewSection({ pastArchiveEvents }: { pastArchiveEvents: EventRecord[] }) {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal>
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">Past Event Archive</p>
          <h2 className="text-display-lg mb-6">Explore Past Event Stories</h2>
        </ScrollReveal>
        {pastArchiveEvents.length === 0 ? (
          <ScrollReveal delay={0.04}>
            <p className="text-sm text-foreground-secondary">No archived events available yet.</p>
          </ScrollReveal>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {pastArchiveEvents.map((event, i) => (
              <ScrollReveal key={event.id} delay={i * 0.08}>
                <article className="border border-border bg-card overflow-hidden">
                  <img src={event.heroImage} alt={event.title} className="w-full aspect-[4/5] object-cover" />
                  <div className="p-5">
                    <h3 className="font-display text-xl text-foreground mb-2">{event.title}</h3>
                    <p className="text-sm text-foreground-secondary mb-4">{event.summary}</p>
                    <Link to={`/events/${event.slug}`} className="text-xs font-display tracking-[0.16em] uppercase text-accent">
                      View Archive
                    </Link>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EventTypesSection() {
  return (
    <section className="relative section-padding bg-secondary/30 overflow-hidden">
      <ParallaxText className="watermark-text absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap" speed={0.3}>
        CREATE
      </ParallaxText>

      <div className="container-narrow relative z-10">
        <ScrollReveal>
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">Experiences</p>
          <h2 className="text-display-lg mb-16">What We Do</h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {eventTypes.map((event, i) => (
            <ScrollReveal key={event.title} delay={i * 0.1}>
              <div className="group">
                <div className="overflow-hidden mb-6">
                  <img src={event.img} alt={event.title} className="w-full aspect-[4/5] object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2 text-foreground">{event.title}</h3>
                <p className="text-body text-sm">{event.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedArtistsSection({ featuredArtists }: { featuredArtists: PersonRecord[] }) {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal>
          <div className="flex items-end justify-between mb-16">
            <div>
              <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">The Collective</p>
              <h2 className="text-display-lg">Featured Artists</h2>
            </div>
            <Link to="/artists" className="hidden md:inline-flex items-center gap-2 font-display text-sm text-foreground-secondary hover:text-accent transition-colors">
              View All <ArrowRight size={14} />
            </Link>
          </div>
        </ScrollReveal>

        {featuredArtists.length === 0 ? (
          <p className="text-sm text-foreground-secondary">Artists will appear here once records are available.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featuredArtists.map((artist, i) => (
              <ScrollReveal key={artist.id} delay={i * 0.08}>
                <Link to={`/artists/${artist.slug}`} className="group block">
                  <div className="relative overflow-hidden mb-4">
                    <img src={artist.image} alt={artist.name} className="w-full aspect-[4/5] object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/60 transition-colors duration-300 flex items-end p-4">
                      <p className="text-background opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-body text-sm">{artist.bio}</p>
                    </div>
                  </div>
                  <h4 className="font-display font-semibold text-sm text-foreground">{artist.name}</h4>
                  <p className="text-foreground-secondary text-xs font-body">{artist.role}</p>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        )}

        <div className="mt-8 md:hidden text-center">
          <Link to="/artists" className="inline-flex items-center gap-2 font-display text-sm text-accent">
            View All Artists <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function CollectivePreviewSection({ collectivePreview }: { collectivePreview: PersonRecord[] }) {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal>
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">Meet the Collective</p>
              <h2 className="text-display-lg">Meet the Collective</h2>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/about">View Full Team</Link>
            </Button>
          </div>
        </ScrollReveal>

        {collectivePreview.length === 0 ? (
          <p className="text-sm text-foreground-secondary">Collective profiles are coming soon.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {collectivePreview.map((person, i) => (
              <ScrollReveal key={person.id} delay={i * 0.06}>
                <article className="border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_32px_-20px_hsl(var(--foreground)/0.35)]">
                  <p className="font-display text-[10px] tracking-[0.2em] uppercase text-accent mb-2">
                    {person.category === "leadership" ? "Leadership" : "Member"}
                  </p>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">{person.name}</h3>
                  <p className="text-sm font-body text-foreground-secondary">{person.role}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PartnersPreviewSection({ homePartners }: { homePartners: PartnerRecord[] }) {
  return (
    <section className="section-padding bg-secondary/20">
      <div className="container-narrow">
        <ScrollReveal>
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">Partners & Collaborations</p>
          <h2 className="text-display-lg mb-5">Partners & Collaborations</h2>
          <p className="text-body-lg max-w-3xl mb-10">
            The Art Galore International collaborates with artists, institutions, brands, and
            community organizations to create vibrant cultural experiences.
          </p>
        </ScrollReveal>

        {homePartners.length === 0 ? (
          <p className="text-sm text-foreground-secondary">Homepage partner highlights will appear here.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {homePartners.map((partner, i) => (
              <ScrollReveal key={partner.id} delay={i * 0.06}>
                <PartnerLogoCard partner={partner} compact />
              </ScrollReveal>
            ))}
          </div>
        )}

        <ScrollReveal delay={0.12}>
          <div className="mt-10">
            <Button variant="outline" size="lg" asChild>
              <Link to="/partners">View All Partners</Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function GalleryStripSection({ images }: { images: string[] }) {
  return (
    <section className="relative section-padding overflow-hidden">
      <ParallaxText className="watermark-text absolute top-1/2 left-0 -translate-y-1/2 whitespace-nowrap" speed={0.2}>
        GALLERY
      </ParallaxText>

      <div className="container-narrow relative z-10">
        <ScrollReveal>
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">Archive</p>
          <h2 className="text-display-lg mb-12">From Our Events</h2>
        </ScrollReveal>
      </div>

      <ScrollReveal>
        <div className="flex gap-4 overflow-x-auto pb-4 px-4 md:px-8 lg:px-16 scrollbar-hide snap-x snap-mandatory">
          {images.map((img, i) => (
            <div key={`${img}-${i}`} className="shrink-0 snap-start w-64 md:w-80">
              <img src={img} alt={`Gallery piece ${i + 1}`} className="w-full aspect-[4/5] object-cover hover:opacity-90 transition-opacity" />
            </div>
          ))}
        </div>
      </ScrollReveal>

      <div className="container-narrow mt-8 text-center md:text-left">
        <Link to="/gallery" className="inline-flex items-center gap-2 font-display text-sm text-accent">
          Explore Full Gallery <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}

export default function Index() {
  const { data: events = [] } = useEventsQuery();
  const { data: people = [] } = usePeopleQuery();
  const { data: partners = [] } = usePartnersQuery();
  const { data: galleryImages = [] } = useGalleryQuery();
  const { data: settings } = usePublicSiteSettingsQuery();

  const featuredArtists = useMemo(() => people.filter((person) => person.isArtist).slice(0, 4), [people]);
  const upcomingEvent = useMemo(() => events.find((item) => item.lifecycle === "upcoming") ?? events[0], [events]);
  const pastArchiveEvents = useMemo(() => events.filter((item) => item.lifecycle === "past").slice(0, 2), [events]);

  const collectivePreview = useMemo(() => {
    const leadership = people.filter((person) => person.category === "leadership").slice(0, 2);
    const members = people.filter((person) => person.category === "member").slice(0, 2);
    return [...leadership, ...members];
  }, [people]);

  const homePartners = useMemo(() => partners.filter((partner) => partner.showOnHomepage).slice(0, 4), [partners]);

  const galleryStripImages = useMemo(() => {
    if (galleryImages.length > 0) {
      return galleryImages.slice(0, 4).map((image) => image.image);
    }

    return [paintingShot, paintingShot2, paintingShot3, paintingShot4];
  }, [galleryImages]);

  const heroTitle = settings?.heroTitle ?? "Where Art Comes Alive";
  const heroSubtitle = settings?.heroSubtitle ?? "Immersive art experiences that bring community together through creativity, culture, and connection.";
  const whatsappLink = settings?.whatsappLink ?? "https://wa.me/254711000000";

  return (
    <>
      <HeroSection heroTitle={heroTitle} heroSubtitle={heroSubtitle} />
      <UpcomingEventSection upcomingEvent={upcomingEvent} />
      <EventTypesSection />
      <FeaturedArtistsSection featuredArtists={featuredArtists} />
      <CollectivePreviewSection collectivePreview={collectivePreview} />
      <JoinCommunitySection whatsappLink={whatsappLink} />
      <PartnersPreviewSection homePartners={homePartners} />
      <PastArchivePreviewSection pastArchiveEvents={pastArchiveEvents} />
      <GalleryStripSection images={galleryStripImages} />
    </>
  );
}
