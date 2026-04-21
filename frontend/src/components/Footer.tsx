import { Instagram, MessageCircle, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import { usePublicSiteSettingsQuery } from "@/hooks/queries/usePublicSiteSettingsQuery";

const fallbackSettings = {
  siteName: "The Art Galore International",
  footerText: "The Art Galore International creates immersive art experiences and community-centered cultural collaborations.",
  instagram: "https://instagram.com/artgaloreinternational",
  x: "https://x.com/artgaloreintl",
  whatsappLink: "https://wa.me/254711000000",
};

export default function Footer() {
  const { data: settings } = usePublicSiteSettingsQuery();

  const siteName = settings?.siteName ?? fallbackSettings.siteName;
  const footerText = settings?.footerText ?? fallbackSettings.footerText;
  const instagramUrl = settings?.instagram ?? fallbackSettings.instagram;
  const xUrl = settings?.x ?? fallbackSettings.x;
  const whatsappLink = settings?.whatsappLink ?? fallbackSettings.whatsappLink;
  const privacyPolicyLink = settings?.privacyPolicyLink ?? "/privacy-policy";
  const termsLink = settings?.termsLink ?? "/terms-of-use";
  const refundPolicyLink = settings?.refundPolicyLink ?? "/ticket-refund-policy";

  return (
    <footer className="bg-primary text-primary-foreground section-padding">
      <div className="container-narrow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          <div>
            <h3 className="font-display text-xl font-bold mb-4">{siteName}</h3>
            <p className="text-primary-foreground/70 font-body text-sm leading-relaxed max-w-xs">{footerText}</p>
          </div>
          <div>
            <h4 className="font-display text-xs tracking-widest uppercase mb-4 text-primary-foreground/50">Navigate</h4>
            <div className="flex flex-col gap-2">
              {[
                { label: "Home", path: "/" },
                { label: "Events", path: "/events" },
                { label: "Artists", path: "/artists" },
                { label: "Gallery", path: "/gallery" },
                { label: "Partners", path: "/partners" },
                { label: "About", path: "/about" },
                { label: "Contact", path: "/contact" },
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
              <a href={instagramUrl} target="_blank" rel="noreferrer" className="text-primary-foreground/70 hover:text-accent transition-colors" aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href={xUrl} target="_blank" rel="noreferrer" className="text-primary-foreground/70 hover:text-accent transition-colors" aria-label="Twitter">
                <Twitter size={20} />
              </a>
            </div>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 font-display text-xs tracking-widest uppercase hover:opacity-90 transition-opacity"
            >
              <MessageCircle size={16} />
              Join WhatsApp
            </a>
            <div className="mt-6 space-y-2">
              <p className="font-display text-xs tracking-widest uppercase text-primary-foreground/50">Legal</p>
              <Link to={privacyPolicyLink} className="block text-primary-foreground/70 hover:text-accent transition-colors text-xs font-body">
                Privacy Policy
              </Link>
              <Link to={termsLink} className="block text-primary-foreground/70 hover:text-accent transition-colors text-xs font-body">
                Terms of Use
              </Link>
              <Link to={refundPolicyLink} className="block text-primary-foreground/70 hover:text-accent transition-colors text-xs font-body">
                Ticket Refund Policy
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-primary-foreground/10 text-center">
          <p className="text-primary-foreground/40 text-xs font-body">&copy; 2026 {siteName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

