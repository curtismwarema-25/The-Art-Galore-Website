import { Link } from "react-router-dom";
import { Instagram, Twitter, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground section-padding">
      <div className="container-narrow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          <div>
            <h3 className="font-display text-xl font-bold mb-4">
              KISII<span className="text-accent">ART</span>
            </h3>
            <p className="text-primary-foreground/70 font-body text-sm leading-relaxed max-w-xs">
              A cultural collective creating immersive art experiences in Kisii and beyond.
            </p>
          </div>
          <div>
            <h4 className="font-display text-xs tracking-widest uppercase mb-4 text-primary-foreground/50">Navigate</h4>
            <div className="flex flex-col gap-2">
              {[
                { label: "Events", path: "/events" },
                { label: "Artists", path: "/artists" },
                { label: "Gallery", path: "/gallery" },
                { label: "Share Your Moment", path: "/share" },
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-primary-foreground/70 hover:text-accent transition-colors text-sm font-body"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-display text-xs tracking-widest uppercase mb-4 text-primary-foreground/50">Connect</h4>
            <div className="flex gap-4 mb-6">
              <a href="#" className="text-primary-foreground/70 hover:text-accent transition-colors" aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-primary-foreground/70 hover:text-accent transition-colors" aria-label="Twitter">
                <Twitter size={20} />
              </a>
            </div>
            <a
              href="#"
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 font-display text-xs tracking-widest uppercase hover:opacity-90 transition-opacity"
            >
              <MessageCircle size={16} />
              Join WhatsApp
            </a>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-primary-foreground/10 text-center">
          <p className="text-primary-foreground/40 text-xs font-body">
            © 2026 KisiiArt Collective. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
