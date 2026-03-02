import { Upload, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";

import gallery1 from "@/assets/gallery-1.jpg";
import gallery2 from "@/assets/gallery-2.jpg";
import gallery3 from "@/assets/gallery-3.jpg";
import gallery4 from "@/assets/gallery-4.jpg";

const communityUploads = [
  { img: gallery1, alias: "Moraa K.", event: "Sip & Paint Vol. 2" },
  { img: gallery2, alias: "Nyakundi O.", event: "Art Night Vol. 3" },
  { img: gallery3, alias: "Anonymous", event: "Pajama Night" },
  { img: gallery4, alias: "Gesare M.", event: "Sip & Paint Vol. 1" },
];

export default function ShareMoment() {
  return (
    <>
      <section className="section-padding">
        <div className="container-narrow">
          <ScrollReveal>
            <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-4">
              Community
            </p>
            <h1 className="text-display-xl mb-4">Share Your Moment</h1>
            <p className="text-body-lg max-w-lg">
              Upload your art, your memories, your perspective. This is your gallery.
            </p>
          </ScrollReveal>

          {/* Upload Zone */}
          <ScrollReveal delay={0.1}>
            <div className="mt-12 max-w-xl">
              <div className="border-2 border-dashed border-border hover:border-accent transition-colors p-12 text-center cursor-pointer group">
                <Upload size={32} className="mx-auto mb-4 text-foreground-secondary group-hover:text-accent transition-colors" />
                <p className="font-display text-sm font-semibold text-foreground mb-1">
                  Drop your image here
                </p>
                <p className="text-xs text-foreground-secondary font-body">
                  or click to browse · JPG, PNG up to 10MB
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="font-display text-xs tracking-widest uppercase text-foreground-secondary block mb-2">
                    Your Alias
                  </label>
                  <div className="flex items-center border border-border">
                    <span className="pl-3 text-foreground-secondary">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      placeholder="How should we credit you?"
                      className="flex-1 px-3 py-3 bg-transparent text-foreground font-body text-sm focus:outline-none placeholder:text-foreground-secondary/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-display text-xs tracking-widest uppercase text-foreground-secondary block mb-2">
                    Event
                  </label>
                  <select className="w-full border border-border bg-transparent px-3 py-3 font-body text-sm text-foreground focus:outline-none appearance-none">
                    <option value="">Select an event</option>
                    <option>Sip & Paint Vol. 2</option>
                    <option>Art Night Vol. 4</option>
                    <option>Pajama Night</option>
                  </select>
                </div>
                <Button variant="accent" size="lg" className="w-full">
                  Submit Your Moment
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Community Grid */}
      <section className="section-padding bg-secondary/30">
        <div className="container-narrow">
          <ScrollReveal>
            <h2 className="text-display-md mb-8">From the Community</h2>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {communityUploads.map((item, i) => (
              <ScrollReveal key={i} delay={i * 0.06}>
                <div>
                  <img
                    src={item.img}
                    alt={`Upload by ${item.alias}`}
                    className="w-full aspect-square object-cover mb-3"
                  />
                  <p className="font-display text-sm font-semibold text-foreground">{item.alias}</p>
                  <p className="text-xs text-foreground-secondary font-body">{item.event}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
