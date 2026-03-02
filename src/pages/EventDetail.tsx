import { Link, useParams } from "react-router-dom";
import { Calendar, MapPin, Clock, Users, ArrowLeft, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";

import sipPaintImg from "@/assets/sip-paint.jpg";
import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";

const ticketTiers = [
  { name: "Early Bird", price: "KES 1,200", perks: "Canvas, 2 Drinks, Art Kit", available: 8 },
  { name: "Standard", price: "KES 1,500", perks: "Canvas, 1 Drink, Art Kit", available: 24 },
  { name: "VIP", price: "KES 2,500", perks: "Premium Canvas, Unlimited Drinks, Art Kit, Front Row", available: 6 },
];

const lineup = [
  { name: "Akinyi Moraa", role: "Lead Instructor", img: artist1 },
  { name: "Obare Nyakundi", role: "Guest Artist", img: artist2 },
  { name: "Kemunto Gesare", role: "DJ Set", img: artist3 },
];

export default function EventDetail() {
  const { id } = useParams();

  return (
    <>
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <img
          src={sipPaintImg}
          alt="Sip & Paint event"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 lg:p-16">
          <div className="container-narrow">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 text-accent font-display text-xs tracking-widest uppercase mb-4 hover:opacity-80 transition-opacity"
            >
              <ArrowLeft size={14} /> Back to Events
            </Link>
            <span className="block font-display text-xs tracking-widest uppercase text-accent mb-3">
              Sip & Paint
            </span>
            <h1 className="text-display-xl text-foreground mb-4">
              Sunset Edition
            </h1>
          </div>
        </div>
      </section>

      {/* Details */}
      <section className="section-padding">
        <div className="container-narrow">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 lg:gap-16">
            {/* Left */}
            <div className="space-y-16">
              <ScrollReveal>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { icon: Calendar, label: "Date", value: "Mar 15, 2026" },
                    { icon: Clock, label: "Time", value: "6:00 — 9:00 PM" },
                    { icon: MapPin, label: "Venue", value: "The Yard, Kisii" },
                    { icon: Users, label: "Capacity", value: "40 Guests" },
                  ].map((item) => (
                    <div key={item.label}>
                      <item.icon size={16} className="text-accent mb-2" />
                      <p className="font-display text-xs tracking-wider uppercase text-foreground-secondary mb-1">{item.label}</p>
                      <p className="font-display font-semibold text-sm text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </ScrollReveal>

              <ScrollReveal>
                <h2 className="text-display-md mb-4">About This Event</h2>
                <div className="text-body space-y-4">
                  <p>
                    Join us for an unforgettable evening of guided painting as the sun sets over Kisii. 
                    Whether you're a first-time painter or a seasoned artist, this session is designed to 
                    inspire creativity in a relaxed, social atmosphere.
                  </p>
                  <p>
                    Each guest receives a canvas, full art kit, and complimentary drinks. Our lead artist 
                    will guide you step-by-step through creating your own sunset masterpiece.
                  </p>
                </div>
              </ScrollReveal>

              {/* Lineup */}
              <ScrollReveal>
                <h2 className="text-display-md mb-8">Lineup</h2>
                <div className="grid grid-cols-3 gap-4 md:gap-6">
                  {lineup.map((artist) => (
                    <div key={artist.name}>
                      <img
                        src={artist.img}
                        alt={artist.name}
                        className="w-full aspect-square object-cover mb-3"
                      />
                      <h4 className="font-display font-semibold text-sm text-foreground">{artist.name}</h4>
                      <p className="text-foreground-secondary text-xs font-body">{artist.role}</p>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>

            {/* Right - Tickets */}
            <div className="lg:sticky lg:top-24 self-start">
              <ScrollReveal>
                <div className="border border-border p-6 space-y-6">
                  <h3 className="font-display text-lg font-semibold text-foreground">Select Tickets</h3>

                  {ticketTiers.map((tier) => (
                    <div key={tier.name} className="py-4 border-b border-border last:border-0">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <h4 className="font-display font-semibold text-sm text-foreground">{tier.name}</h4>
                          <p className="text-xs text-foreground-secondary font-body">{tier.perks}</p>
                        </div>
                        <span className="font-display font-bold text-foreground">{tier.price}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-accent font-body">{tier.available} left</span>
                        <div className="flex items-center gap-3 border border-border">
                          <button className="p-2 text-foreground-secondary hover:text-foreground transition-colors" aria-label="Decrease quantity">
                            <Minus size={14} />
                          </button>
                          <span className="font-display text-sm w-4 text-center text-foreground">0</span>
                          <button className="p-2 text-foreground-secondary hover:text-foreground transition-colors" aria-label="Increase quantity">
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button variant="accent" size="lg" className="w-full">
                    Checkout — KES 0
                  </Button>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
