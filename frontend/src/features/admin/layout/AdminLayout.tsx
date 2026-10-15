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
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/features/auth/useAuth";

type AdminNavItem = { label: string; path: string; icon: LucideIcon; end?: boolean; description: string };

const navItems: AdminNavItem[] = [
  { label: "Today", path: "/admin", icon: LayoutDashboard, end: true, description: "See what needs attention and open the next task." },
  { label: "Events & Tickets", path: "/admin/events", icon: Calendar, description: "Create the event, publish it, and set the tickets people can buy." },
  { label: "Orders & Payments", path: "/admin/orders", icon: Ticket, description: "Resolve payment questions and get paid orders ready for entry." },
  { label: "Check-In", path: "/admin/checkin", icon: Ticket, description: "Scan or search a ticket, then confirm the guest in one step." },
  { label: "People & Artists", path: "/admin/people", icon: Users, description: "Keep public profiles accurate, useful, and ready to publish." },
  { label: "Gallery", path: "/admin/gallery", icon: Image, description: "Add event images, captions, and the visual story visitors will see." },
  { label: "Community", path: "/admin/uploads", icon: Upload, description: "Review community submissions and approve the right images." },
  { label: "Partners", path: "/admin/partners", icon: Handshake, description: "Keep partner information current and decide what is public." },
  { label: "Settings", path: "/admin/settings", icon: Settings, description: "Update public copy, contact details, links, and ticket support." },
] as const;

function getPageMeta(pathname: string) {
  if (pathname.startsWith("/admin/checkin")) {
    return { title: "Check-In", description: "Scan or search a ticket, then confirm the guest in one step." };
  }
  const matched = navItems.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
  if (!matched) return { title: "Admin", description: "Manage the public site and keep every event moving." };
  return { title: matched.label, description: matched.description };
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoggingOut } = useAuth();

  const pageMeta = useMemo(() => getPageMeta(location.pathname), [location.pathname]);

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
              aria-expanded={!collapsed}
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
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
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
                  aria-expanded={mobileMenuOpen}
                  aria-controls="admin-mobile-navigation"
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
                    id="admin-mobile-navigation"
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
                        {isLoggingOut ? "Signing out..." : "Sign Out"}
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
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
            <PageHeader compact eyebrow="Admin" title={pageMeta.title} description={pageMeta.description} />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

