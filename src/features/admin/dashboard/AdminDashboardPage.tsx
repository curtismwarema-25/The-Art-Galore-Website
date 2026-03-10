import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/common/EmptyState";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import SectionHeader from "@/components/common/SectionHeader";
import StatCard from "@/components/common/StatCard";
import { mockChartSeries } from "@/data/mock";
import { useAdminStatsQuery } from "@/hooks/queries/useAdminStatsQuery";
import AdminChartPlaceholder from "@/features/admin/shared/AdminChartPlaceholder";
import AdminSectionCard from "@/features/admin/shared/AdminSectionCard";

const statCards = [
  { key: "upcomingEventsCount", label: "Upcoming Events" },
  { key: "pastEventsCount", label: "Past Events" },
  { key: "ticketsSold", label: "Tickets Sold" },
  { key: "paidOrders", label: "Paid Orders" },
  { key: "pendingOrders", label: "Pending Orders" },
  { key: "pendingUploads", label: "Pending Uploads" },
  { key: "artistsCount", label: "Artists" },
  { key: "partnersCount", label: "Partners" },
] as const;

export default function AdminDashboardPage() {
  const { data: stats, isLoading, isError } = useAdminStatsQuery();

  if (isLoading) {
    return <LoadingSkeleton rows={6} />;
  }

  if (isError || !stats) {
    return (
      <EmptyState
        title="Dashboard unavailable"
        description="Could not load dashboard metrics. Connect this to backend error handling."
      />
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <SectionHeader title="Overview" subtitle="Backend-ready operational summary with mock analytics placeholders." />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={(stats[card.key] ?? 0).toLocaleString()}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-5">
        <AdminChartPlaceholder title="Ticket Sales Over Time" series={mockChartSeries.ticketSalesOverTime} />
        <AdminChartPlaceholder title="Event Attendance Trends" series={mockChartSeries.attendanceTrends} />
        <AdminChartPlaceholder title="Uploads By Event" series={mockChartSeries.uploadsByEvent} />
      </div>

      <AdminSectionCard title="Quick Actions">
        <div className="flex flex-wrap gap-3">
          <Button size="sm" variant="accent" asChild>
            <Link to="/admin/events">Create Event</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/orders">Review Orders</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/checkin">Open Check-In</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/uploads">Moderate Uploads</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/partners">Manage Partners</Link>
          </Button>
        </div>
      </AdminSectionCard>
    </div>
  );
}
