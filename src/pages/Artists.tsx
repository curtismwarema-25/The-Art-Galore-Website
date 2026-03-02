import { Link } from "react-router-dom";
import ScrollReveal from "@/components/ScrollReveal";
import ParallaxText from "@/components/ParallaxText";

import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";
import artist4 from "@/assets/artist-4.jpg";

const artists = [
  { id: "1", name: "Akinyi Moraa", role: "Mixed Media", bio: "Exploring the intersection of tradition and modernity through layered narratives.", img: artist1 },
  { id: "2", name: "Obare Nyakundi", role: "Oil & Canvas", bio: "Bold, emotive works that capture the rhythm of everyday life in Kisii.", img: artist2 },
  { id: "3", name: "Kemunto Gesare", role: "Digital Art", bio: "Transforming cultural motifs into vibrant digital compositions.", img: artist3 },
  { id: "4", name: "Omari Bosire", role: "Sculpture", bio: "Three-dimensional stories carved from soapstone and found materials.", img: artist4 },
  { id: "5", name: "Nyaboke Atieno", role: "Watercolor", bio: "Delicate washes of color that speak to memory and belonging.", img: artist1 },
  { id: "6", name: "Mogaka Ontita", role: "Photography", bio: "Documentary and fine art photography rooted in community storytelling.", img: artist2 },
];

export default function Artists() {
  return (
    <>
      <section className="section-padding pb-8">
        <div className="container-narrow">
          <ScrollReveal>
            <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">
              The Collective
            </p>
            <h1 className="text-display-xl mb-4">Artists</h1>
            <p className="text-body-lg max-w-lg">
              Meet the creators behind our immersive experiences.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <div className="relative overflow-hidden mb-8">
        <ParallaxText className="watermark-text absolute top-0 left-0 whitespace-nowrap" speed={0.15}>
          COLLECTIVE
        </ParallaxText>
      </div>

      <section className="section-padding pt-0">
        <div className="container-narrow">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
            {artists.map((artist, i) => (
              <ScrollReveal key={artist.id} delay={i * 0.06}>
                <Link to={`/artists/${artist.id}`} className="group block">
                  <div className="relative overflow-hidden mb-4">
                    <img
                      src={artist.img}
                      alt={artist.name}
                      className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/60 transition-colors duration-300 flex items-end p-4 md:p-6">
                      <p className="text-background opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-body text-sm leading-relaxed">
                        {artist.bio}
                      </p>
                    </div>
                  </div>
                  <h3 className="font-display font-semibold text-foreground">{artist.name}</h3>
                  <p className="text-foreground-secondary text-sm font-body">{artist.role}</p>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
