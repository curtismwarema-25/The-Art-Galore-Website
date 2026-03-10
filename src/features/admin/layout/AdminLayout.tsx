import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Handshake,
  Image,
  LayoutDashboard,
  LogOut,
  Settings,
  Ticket,
  Upload,
  Users,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/features/auth/AuthContext";

const navItems = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  { label: "Events", path: "/admin/events", icon: Calendar },
  { label: "Tickets", path: "/admin/orders", icon: Ticket },
  { label: "People", path: "/admin/people", icon: Users },
  { label: "Galleries", path: "/admin/gallery", icon: Image },
  { label: "Community Uploads", path: "/admin/uploads", icon: Upload },
  { label: "Partners", path: "/admin/partners", icon: Handshake },
  { label: "Site Settings", path: "/admin/settings", icon: Settings },
] as const;

function getTitle(pathname: string) {
  if (pathname.startsWith("/admin/checkin")) return "Check-In";
  const matched = navItems.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
  if (!matched) return "Admin";
  return matched.label;
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoggingOut } = useAuth();

  const title = useMemo(() => getTitle(location.pathname), [location.pathname]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/admin/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen flex">
        <aside className={`${collapsed ? "w-[74px]" : "w-64"} shrink-0 border-r border-border bg-secondary/35 transition-all duration-200`}>
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

        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-secondary/20 px-3 py-2">
              <p className="text-xs md:text-sm text-foreground-secondary">
                Signed in as <span className="text-foreground">{user?.fullName ?? "Admin"}</span>
                {" · "}
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
            <PageHeader compact eyebrow="Admin" title={title} description="Operational center for Art Galore International." />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
