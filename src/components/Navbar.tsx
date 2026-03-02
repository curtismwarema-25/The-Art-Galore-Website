import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Events", path: "/events" },
  { label: "Artists", path: "/artists" },
  { label: "Gallery", path: "/gallery" },
  { label: "Share", path: "/share" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm">
      <div className="container-narrow flex items-center justify-between h-16 px-4 md:px-8">
        <Link to="/" className="font-display font-bold text-xl tracking-tight text-foreground">
          KISII<span className="text-accent">ART</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`font-display text-sm tracking-wider uppercase transition-colors duration-200 ${
                location.pathname.startsWith(link.path)
                  ? "text-accent"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/events"
            className="bg-accent text-accent-foreground px-5 py-2.5 font-display text-xs tracking-widest uppercase hover:opacity-90 transition-opacity"
          >
            Buy Tickets
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-foreground p-2"
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-background border-b border-border"
          >
            <div className="px-4 py-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setOpen(false)}
                  className={`font-display text-lg tracking-wide ${
                    location.pathname.startsWith(link.path)
                      ? "text-accent"
                      : "text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/events"
                onClick={() => setOpen(false)}
                className="bg-accent text-accent-foreground px-5 py-3 font-display text-sm tracking-widest uppercase text-center mt-2"
              >
                Buy Tickets
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
