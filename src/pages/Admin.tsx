import { useState } from "react";
import {
  Calendar,
  Image,
  Users,
  ShoppingBag,
  Upload,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Events", icon: Calendar },
  { label: "Ticket Tiers", icon: ShoppingBag },
  { label: "Orders", icon: ShoppingBag },
  { label: "Galleries", icon: Image },
  { label: "Community Uploads", icon: Upload },
  { label: "Artists", icon: Users },
];

const statsCards = [
  { label: "Total Events", value: "12", change: "+2 this month" },
  { label: "Tickets Sold", value: "348", change: "+64 this week" },
  { label: "Revenue", value: "KES 485K", change: "+18% vs last month" },
  { label: "Pending Uploads", value: "7", change: "Awaiting review" },
];

export default function Admin() {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-56"
        } bg-primary text-primary-foreground flex flex-col transition-all duration-200 shrink-0`}
      >
        <div className="p-4 flex items-center justify-between">
          {!collapsed && (
            <span className="font-display font-bold text-sm tracking-wider">
              ADMIN
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-primary-foreground/70 hover:text-primary-foreground transition-colors"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveNav(item.label)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-body transition-colors rounded ${
                activeNav === item.label
                  ? "bg-sidebar-accent text-accent"
                  : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-5xl">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">{activeNav}</h1>
          <p className="text-sm text-foreground-secondary font-body mb-8">
            Manage your art collective's platform.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statsCards.map((stat) => (
              <div key={stat.label} className="border border-border p-4">
                <p className="font-display text-xs tracking-wider uppercase text-foreground-secondary mb-1">
                  {stat.label}
                </p>
                <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-accent font-body mt-1">{stat.change}</p>
              </div>
            ))}
          </div>

          {/* Placeholder table */}
          <div className="border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="font-display text-sm font-semibold text-foreground">Recent Orders</h3>
            </div>
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-display text-sm text-foreground">Order #{1000 + i}</p>
                    <p className="text-xs text-foreground-secondary font-body">Sip & Paint · 2 tickets</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-sm font-semibold text-foreground">KES 3,000</p>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-display tracking-wider uppercase bg-accent/10 text-accent">
                      Confirmed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
