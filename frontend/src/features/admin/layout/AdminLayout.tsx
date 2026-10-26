import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Handshake,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Ticket,
  Upload,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/features/auth/useAuth";

const navItems: Array<{ label: string; path: string; icon: LucideIcon; end?: boolean }> = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  { label: "Events", path: "/admin/events", icon: Calendar },
  { label: "Orders", path: "/admin/orders", icon: Ticket },
  { label: "People", path: "/admin/people", icon: Users },
  { label: "Gallery", path: "/admin/gallery", icon: Image },
  { label: "Community uploads", path: "/admin/uploads", icon: Upload },
  { label: "Partners", path: "/admin/partners", icon: Handshake },
  { label: "Site settings", path: "/admin/settings", icon: Settings },
];

function getTitle(pathname: string) {
  if (pathname.startsWith("/admin/checkin")) return "Guest check-in";
  const matched = navItems.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
  if (!matched) return "Admin";
  return matched.label;
}

function getPageDescription(pathname: string) {
  if (pathname.startsWith("/admin/events")) return "Create events, update event details, and manage ticket tiers.";
  if (pathname.startsWith("/admin/orders")) return "Review orders, payment submissions, and ticket delivery.";
  if (pathname.startsWith("/admin/checkin")) return "Find tickets and record guest entry.";
  if (pathname.startsWith("/admin/people")) return "Manage artist and team profiles shown on the public site.";
  if (pathname.startsWith("/admin/gallery")) return "Manage images displayed in the public gallery.";
  if (pathname.startsWith("/admin/uploads")) return "Review and moderate community-submitted images.";
  if (pathname.startsWith("/admin/partners")) return "Manage partner details and homepage visibility.";
  if (pathname.startsWith("/admin/settings")) return "Update public site content, contact details, and links.";
  return "Review event activity and items that need follow-up.";
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoggingOut } = useAuth();

  const title = useMemo(() => getTitle(location.pathname), [location.pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/admin/login", { replace: true });
    }
  }

  const desktopSidebarWidthClassName = collapsed ? "w-[74px]" : "w-64";
  const isMobileNavLinkActive = (path: string, end?: boolean) => {
    if (end) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen flex">
        <aside className={`${desktopSidebarWidthClassName} hidden md:block shrink-0 border-r border-border bg-secondary/35 transition-all duration-200`}>
          <div className="h-16 px-3 md:px-4 border-b border-border flex items-center justify-between">
            {!collapsed && (
              <div>
                <p className="font-display text-[11px] tracking-[0.18em] uppercase text-foreground-secondary">Art Galore International</p>
                <p className="font-display text-sm text-foreground">Admin</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((current) => !current)}
              className="h-8 w-8 rounded-md border border-border text-foreground-secondary hover:text-accent transition-colors inline-flex items-center justify-center"
              aria-label="Toggle sidebar"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          <nav className="p-2 md:p-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `w-full rounded-md border px-2.5 py-2.5 text-sm font-body transition-all flex items-center gap-2.5 ${
                    isActive
                      ? "border-accent/35 bg-accent/12 text-accent"
                      : "border-transparent text-foreground-secondary hover:border-border hover:text-foreground"
                  }`
                }
              >
                <item.icon size={16} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 overflow-auto">
          <div className="mx-auto max-w-screen-xl px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
            <div className="mb-4 md:hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-bold text-base tracking-tight text-foreground">
                    Art Galore <span className="text-accent">Admin</span>
                  </p>
                  <p className="font-display text-[10px] tracking-[0.14em] uppercase text-foreground-secondary">
                    Control Panel
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((current) => !current)}
                  className="text-foreground p-2"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>

              <AnimatePresence>
                {mobileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="bg-background border-b border-border mt-2"
                  >
                    <div className="px-4 py-6 flex flex-col gap-4">
                      {navItems.map((item) => (
                        <Link
                          key={`mobile-${item.path}`}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`font-display text-lg tracking-wide flex items-center gap-2.5 ${
                            isMobileNavLinkActive(item.path, item.end) ? "text-accent" : "text-foreground"
                          }`}
                        >
                          <item.icon size={18} className="shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      ))}

                      <button
                        type="button"
                        onClick={() => void handleLogout()}
                        disabled={isLoggingOut}
                        className="bg-accent text-accent-foreground px-5 py-3 font-display text-sm tracking-widest uppercase text-center mt-2 disabled:opacity-70"
                      >
                        {isLoggingOut ? "Signing out…" : "Sign out"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-secondary/20 px-3 py-2">
              <p className="text-xs md:text-sm text-foreground-secondary">
                Signed in as <span className="text-foreground">{user?.fullName ?? "Admin"}</span>
                {" | "}
                <span className="uppercase tracking-[0.1em]">{user?.role ?? "admin"}</span>
              </p>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs tracking-[0.12em] uppercase text-foreground-secondary hover:text-foreground disabled:opacity-60"
              >
                <LogOut size={14} />
                {isLoggingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
            <PageHeader compact eyebrow="Admin" title={title} description={getPageDescription(location.pathname)} />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

