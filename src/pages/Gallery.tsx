import { useState } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ScrollReveal from "@/components/ScrollReveal";
import ParallaxText from "@/components/ParallaxText";

import gallery1 from "@/assets/gallery-1.jpg";
import gallery2 from "@/assets/gallery-2.jpg";
import gallery3 from "@/assets/gallery-3.jpg";
import gallery4 from "@/assets/gallery-4.jpg";
import sipPaint from "@/assets/sip-paint.jpg";
import artNight from "@/assets/art-night.jpg";
import pajamaNight from "@/assets/pajama-night.jpg";
import heroImg from "@/assets/hero-art-event.jpg";

const filters = ["All", "Sip & Paint", "Art Night", "Pajama Night"];

const galleryItems = [
  { img: gallery1, event: "Sip & Paint", title: "Faces of Kisii" },
  { img: gallery2, event: "Art Night", title: "Golden Hour" },
  { img: gallery3, event: "Sip & Paint", title: "The Gaze" },
  { img: gallery4, event: "Pajama Night", title: "Savanna Dreams" },
  { img: sipPaint, event: "Sip & Paint", title: "Brushwork" },
  { img: artNight, event: "Art Night", title: "Exhibition View" },
  { img: pajamaNight, event: "Pajama Night", title: "Late Night Canvas" },
  { img: heroImg, event: "Art Night", title: "Collective Session" },
];

export default function Gallery() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const filtered = activeFilter === "All"
    ? galleryItems
    : galleryItems.filter((item) => item.event === activeFilter);

  return (
    <>
      <section className="section-padding pb-8">
        <div className="container-narrow">
          <ScrollReveal>
            <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">
              Archive
            </p>
            <h1 className="text-display-xl mb-4">Gallery</h1>
            <p className="text-body-lg max-w-lg">
              Moments captured, stories preserved.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <div className="relative overflow-hidden mb-4">
        <ParallaxText className="watermark-text absolute top-0 left-0 whitespace-nowrap" speed={0.2}>
          ARCHIVE
        </ParallaxText>
      </div>

      {/* Filters */}
      <section className="px-4 md:px-8 lg:px-16 pb-8">
        <div className="container-narrow">
          <div className="flex gap-2 flex-wrap">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 font-display text-xs tracking-widest uppercase transition-colors ${
                  activeFilter === f
                    ? "bg-accent text-accent-foreground"
                    : "border border-border text-foreground-secondary hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Masonry Grid */}
      <section className="px-4 md:px-8 lg:px-16 pb-16">
        <div className="container-narrow">
          <div className="columns-2 md:columns-3 gap-4 space-y-4">
            {filtered.map((item, i) => (
              <ScrollReveal key={`${item.title}-${i}`} delay={i * 0.04}>
                <button
                  onClick={() => setLightboxImg(item.img)}
                  className="block w-full group relative break-inside-avoid"
                >
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full object-cover group-hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors duration-300 flex items-end p-4">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-background font-display font-semibold text-sm">{item.title}</p>
                      <p className="text-background/70 text-xs font-body">{item.event}</p>
                    </div>
                  </div>
                </button>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4"
            onClick={() => setLightboxImg(null)}
          >
            <button
              className="absolute top-4 right-4 text-background hover:text-accent transition-colors"
              onClick={() => setLightboxImg(null)}
              aria-label="Close lightbox"
            >
              <X size={28} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={lightboxImg}
              alt="Gallery full view"
              className="max-w-full max-h-[85vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
