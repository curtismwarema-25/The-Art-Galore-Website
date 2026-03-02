import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Calendar, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import ParallaxText from "@/components/ParallaxText";

import heroImg from "@/assets/hero-art-event.jpg";
import sipPaintImg from "@/assets/sip-paint.jpg";
import artNightImg from "@/assets/art-night.jpg";
import pajamaNightImg from "@/assets/pajama-night.jpg";
import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";
import artist4 from "@/assets/artist-4.jpg";
import gallery1 from "@/assets/gallery-1.jpg";
import gallery2 from "@/assets/gallery-2.jpg";
import gallery3 from "@/assets/gallery-3.jpg";
import gallery4 from "@/assets/gallery-4.jpg";

const featuredArtists = [
  { name: "Akinyi Moraa", role: "Mixed Media", img: artist1 },
  { name: "Obare Nyakundi", role: "Oil & Canvas", img: artist2 },
  { name: "Kemunto Gesare", role: "Digital Art", img: artist3 },
  { name: "Omari Bosire", role: "Sculpture", img: artist4 },
];

const eventTypes = [
  {
    title: "Sip & Paint",
    desc: "Wine, canvas, and good company. An evening of guided painting in an intimate setting.",
    img: sipPaintImg,
  },
  {
    title: "Art Night",
    desc: "Gallery walks, live art, poetry, and music. A curated cultural experience.",
    img: artNightImg,
  },
  {
    title: "Pajama Night",
    desc: "Come as you are. Art-making in comfort — a creative sanctuary in sleepwear.",
    img: pajamaNightImg,
  },
];

const galleryImages = [gallery1, gallery2, gallery3, gallery4];

function HeroSection() {
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
      {/* BG Image with parallax */}
      <motion.div
        style={{ y: heroY }}
        className="absolute inset-0 -top-12"
      >
        <img
          src={heroImg}
          alt="Immersive art event"
          className="w-full h-[120%] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </motion.div>

      {/* Accent shape */}
      <div className="absolute top-24 right-8 md:right-16 w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-accent/30 opacity-60" />
      <div className="absolute bottom-32 left-8 md:left-16 w-8 h-32 bg-accent/10" />

      {/* Content */}
      <motion.div
        style={{ y: textY, opacity }}
        className="relative z-10 h-full flex flex-col justify-end pb-16 md:pb-24 px-4 md:px-8 lg:px-16"
      >
        <div className="container-narrow w-full">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="font-display text-xs tracking-[0.3em] uppercase mb-4 text-accent"
          >
            Kisii Art Collective
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-display-xl text-foreground mb-6 max-w-4xl"
          >
            Where Art
            <br />
            Comes Alive
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-body-lg max-w-md mb-8"
          >
            Immersive art experiences that bring community together through creativity, culture, and connection.
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

function UpcomingEventSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal>
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">
            Coming Up
          </p>
          <h2 className="text-display-lg mb-12">Next Event</h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="overflow-hidden">
              <img
                src={sipPaintImg}
                alt="Upcoming Sip & Paint event"
                className="w-full aspect-[4/5] object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="font-display text-6xl md:text-7xl font-bold text-foreground leading-none">15</p>
                <p className="font-display text-xl text-foreground-secondary">March 2026</p>
              </div>
              <h3 className="text-display-md">Sip & Paint: Sunset Edition</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-body">
                  <Clock size={16} className="text-accent shrink-0" />
                  <span>6:00 PM — 9:00 PM</span>
                </div>
                <div className="flex items-center gap-3 text-body">
                  <MapPin size={16} className="text-accent shrink-0" />
                  <span>The Yard, Kisii Town</span>
                </div>
                <div className="flex items-center gap-3 text-body">
                  <Calendar size={16} className="text-accent shrink-0" />
                  <span>Limited to 40 guests</span>
                </div>
              </div>
              <Button variant="accent" size="lg" asChild>
                <Link to="/events/1" className="inline-flex items-center gap-2">
                  Get Tickets <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function EventTypesSection() {
  return (
    <section className="relative section-padding bg-secondary/30 overflow-hidden">
      {/* Watermark */}
      <ParallaxText className="watermark-text absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap" speed={0.3}>
        CREATE
      </ParallaxText>

      <div className="container-narrow relative z-10">
        <ScrollReveal>
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">
            Experiences
          </p>
          <h2 className="text-display-lg mb-16">What We Do</h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {eventTypes.map((event, i) => (
            <ScrollReveal key={event.title} delay={i * 0.1}>
              <div className="group">
                <div className="overflow-hidden mb-6">
                  <img
                    src={event.img}
                    alt={event.title}
                    className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-700"
                  />
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

function FeaturedArtistsSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal>
          <div className="flex items-end justify-between mb-16">
            <div>
              <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">
                The Collective
              </p>
              <h2 className="text-display-lg">Featured Artists</h2>
            </div>
            <Link
              to="/artists"
              className="hidden md:inline-flex items-center gap-2 font-display text-sm text-foreground-secondary hover:text-accent transition-colors"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {featuredArtists.map((artist, i) => (
            <ScrollReveal key={artist.name} delay={i * 0.08}>
              <Link to="/artists" className="group block">
                <div className="relative overflow-hidden mb-4">
                  <img
                    src={artist.img}
                    alt={artist.name}
                    className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/60 transition-colors duration-300 flex items-end p-4">
                    <p className="text-background opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-body text-sm">
                      Emerging voice in {artist.role.toLowerCase()}, exploring identity and landscape.
                    </p>
                  </div>
                </div>
                <h4 className="font-display font-semibold text-sm text-foreground">{artist.name}</h4>
                <p className="text-foreground-secondary text-xs font-body">{artist.role}</p>
              </Link>
            </ScrollReveal>
          ))}
        </div>

        <div className="mt-8 md:hidden text-center">
          <Link
            to="/artists"
            className="inline-flex items-center gap-2 font-display text-sm text-accent"
          >
            View All Artists <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function GalleryStripSection() {
  return (
    <section className="relative section-padding overflow-hidden">
      <ParallaxText className="watermark-text absolute top-1/2 left-0 -translate-y-1/2 whitespace-nowrap" speed={0.2}>
        GALLERY
      </ParallaxText>

      <div className="container-narrow relative z-10">
        <ScrollReveal>
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">
            Archive
          </p>
          <h2 className="text-display-lg mb-12">From Our Events</h2>
        </ScrollReveal>
      </div>

      {/* Horizontal scroll strip */}
      <ScrollReveal>
        <div className="flex gap-4 overflow-x-auto pb-4 px-4 md:px-8 lg:px-16 scrollbar-hide snap-x snap-mandatory">
          {galleryImages.map((img, i) => (
            <div key={i} className="shrink-0 snap-start w-64 md:w-80">
              <img
                src={img}
                alt={`Gallery piece ${i + 1}`}
                className="w-full aspect-square object-cover hover:opacity-90 transition-opacity"
              />
            </div>
          ))}
        </div>
      </ScrollReveal>

      <div className="container-narrow mt-8 text-center md:text-left">
        <Link
          to="/gallery"
          className="inline-flex items-center gap-2 font-display text-sm text-accent"
        >
          Explore Full Gallery <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}

export default function Index() {
  return (
    <>
      <HeroSection />
      <UpcomingEventSection />
      <EventTypesSection />
      <FeaturedArtistsSection />
      <GalleryStripSection />
    </>
  );
}
