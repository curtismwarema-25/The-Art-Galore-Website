import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

import artist1 from "@/assets/artist-1.jpg";
import gallery1 from "@/assets/gallery-1.jpg";
import gallery2 from "@/assets/gallery-2.jpg";
import gallery3 from "@/assets/gallery-3.jpg";
import gallery4 from "@/assets/gallery-4.jpg";

const works = [gallery1, gallery2, gallery3, gallery4];

export default function ArtistProfile() {
  const { id } = useParams();

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
              <img
                src={artist1}
                alt="Akinyi Moraa"
                className="w-full aspect-[3/4] object-cover"
              />
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="space-y-6">
                <div>
                  <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-2">Artist</p>
                  <h1 className="text-display-lg mb-2">Akinyi Moraa</h1>
                  <p className="font-display text-foreground-secondary">Mixed Media</p>
                </div>
                <div className="text-body space-y-4">
                  <p>
                    Akinyi Moraa is a Kisii-based mixed media artist whose work explores the intersection 
                    of tradition and modernity. Her layered compositions draw from Gusii cultural heritage 
                    while speaking to contemporary themes of identity, displacement, and belonging.
                  </p>
                  <p>
                    A founding member of the collective, Akinyi has been instrumental in shaping the 
                    creative direction of our events, bringing her unique vision to every experience.
                  </p>
                </div>

                <div>
                  <h3 className="font-display text-xs tracking-widest uppercase text-foreground-secondary mb-3">Seen At</h3>
                  <div className="flex flex-wrap gap-2">
                    {["Sip & Paint Vol. 1", "Art Night Vol. 3", "Pajama Night"].map((event) => (
                      <span
                        key={event}
                        className="px-3 py-1.5 text-xs font-display border border-border text-foreground-secondary"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="section-padding pt-0">
        <div className="container-narrow">
          <ScrollReveal>
            <h2 className="text-display-md mb-8">Works</h2>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {works.map((img, i) => (
              <ScrollReveal key={i} delay={i * 0.06}>
                <img
                  src={img}
                  alt={`Work ${i + 1}`}
                  className="w-full aspect-square object-cover hover:opacity-90 transition-opacity"
                />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
