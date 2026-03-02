import { Link } from "react-router-dom";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import ParallaxText from "@/components/ParallaxText";

import sipPaintImg from "@/assets/sip-paint.jpg";
import artNightImg from "@/assets/art-night.jpg";
import pajamaNightImg from "@/assets/pajama-night.jpg";


const events = [
  {
    id: "1",
    title: "Sip & Paint: Sunset Edition",
    date: "Mar 15, 2026",
    day: "15",
    month: "MAR",
    time: "6:00 PM",
    venue: "The Yard, Kisii Town",
    type: "Sip & Paint",
    img: sipPaintImg,
    price: "KES 1,500",
  },
  {
    id: "2",
    title: "Art Night Vol. 4",
    date: "Apr 5, 2026",
    day: "05",
    month: "APR",
    time: "7:00 PM",
    venue: "Rooftop Gallery, Kisii",
    type: "Art Night",
    img: artNightImg,
    price: "KES 2,000",
  },
  {
    id: "3",
    title: "Pajama Night: Late Edition",
    date: "Apr 26, 2026",
    day: "26",
    month: "APR",
    time: "8:00 PM",
    venue: "Studio 7, Kisii Town",
    type: "Pajama Night",
    img: pajamaNightImg,
    price: "KES 1,200",
  },
];

export default function Events() {
  return (
    <>
      {/* Header */}
      <section className="section-padding pb-8 md:pb-12">
        <div className="container-narrow">
          <ScrollReveal>
            <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">
              Upcoming
            </p>
            <h1 className="text-display-xl mb-4">Events</h1>
            <p className="text-body-lg max-w-lg">
              Find your next immersive art experience. Limited seats, unlimited creativity.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Watermark */}
      <div className="relative overflow-hidden">
        <ParallaxText className="watermark-text absolute top-0 left-0 whitespace-nowrap" speed={0.2}>
          SIP PAINT POETRY
        </ParallaxText>
      </div>

      {/* Event List */}
      <section className="section-padding pt-0">
        <div className="container-narrow space-y-8">
          {events.map((event, i) => (
            <ScrollReveal key={event.id} delay={i * 0.08}>
              <Link to={`/events/${event.id}`} className="group block">
                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 md:gap-8 items-center py-8 border-b border-border">
                  {/* Date */}
                  <div className="hidden md:block text-center">
                    <p className="font-display text-5xl font-bold text-foreground leading-none">{event.day}</p>
                    <p className="font-display text-sm tracking-widest text-accent">{event.month}</p>
                  </div>

                  {/* Info */}
                  <div className="flex gap-4 md:gap-6 items-start">
                    <div className="md:hidden shrink-0">
                      <p className="font-display text-3xl font-bold text-foreground leading-none">{event.day}</p>
                      <p className="font-display text-xs tracking-widest text-accent">{event.month}</p>
                    </div>
                    <div className="flex-1">
                      <span className="inline-block font-display text-[10px] tracking-widest uppercase text-accent mb-2">
                        {event.type}
                      </span>
                      <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground group-hover:text-accent transition-colors mb-2">
                        {event.title}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-foreground-secondary">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-accent" /> {event.time}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-accent" /> {event.venue}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div className="flex items-center gap-4 md:flex-col md:items-end">
                    <span className="font-display font-semibold text-foreground">{event.price}</span>
                    <span className="text-accent group-hover:translate-x-1 transition-transform">
                      <ArrowRight size={20} />
                    </span>
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </>
  );
}
