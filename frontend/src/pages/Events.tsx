import { useMemo, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import FilterBar from "@/components/common/FilterBar";
import EmptyState from "@/components/common/EmptyState";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import EventCard from "@/components/cards/EventCard";
import { useEventsQuery } from "@/hooks/queries/useEventsQuery";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Events() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const { data: events = [], isLoading, isError } = useEventsQuery();

  const filteredEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return events
      .filter((event) => event.lifecycle === activeTab)
      .filter((event) => (typeFilter === "all" ? true : event.type === typeFilter))
      .filter((event) => {
        if (dateFilter === "all") return true;
        const eventDate = new Date(event.date);
        const now = new Date();

        if (dateFilter === "this-month") {
          return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
        }

        if (dateFilter === "this-year") {
          return eventDate.getFullYear() === now.getFullYear();
        }

        return true;
      })
      .filter((event) => {
        if (!normalizedSearch) return true;
        return (
          event.title.toLowerCase().includes(normalizedSearch) ||
          event.venue.toLowerCase().includes(normalizedSearch) ||
          event.type.toLowerCase().includes(normalizedSearch)
        );
      });
  }, [activeTab, dateFilter, events, search, typeFilter]);

  return (
    <section className="section-padding">
      <div className="container-narrow space-y-6 md:space-y-8">
        <PageHeader
          eyebrow="Events"
          title="Events"
          description="Discover upcoming programs and browse our cultural archive of past experiences."
        />

        <div className="inline-flex rounded-md border border-border bg-secondary/20 p-1">
          {[
            { key: "upcoming", label: "Upcoming Events" },
            { key: "past", label: "Past Events" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as "upcoming" | "past")}
              className={`px-4 py-2 text-xs md:text-sm font-display tracking-[0.16em] uppercase transition-colors rounded-sm ${
                activeTab === tab.key ? "bg-accent text-accent-foreground" : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by event title, type, or venue"
          filters={[
            {
              key: "type",
              label: "Event Type",
              value: typeFilter,
              onChange: setTypeFilter,
              options: [
                { label: "All Types", value: "all" },
                { label: "Sip & Paint", value: "Sip & Paint" },
                { label: "Art Night", value: "Art Night" },
                { label: "Pajama Night", value: "Pajama Night" },
                { label: "Workshop", value: "Workshop" },
              ],
            },
            {
              key: "date",
              label: "Date",
              value: dateFilter,
              onChange: setDateFilter,
              options: [
                { label: "All Dates", value: "all" },
                { label: "This Month", value: "this-month" },
                { label: "This Year", value: "this-year" },
              ],
            },
          ]}
        />

        {isLoading && <LoadingSkeleton rows={4} />}

        {isError && (
          <EmptyState
            title="Could not load events"
            description="This is an error placeholder. Wire this to backend/API error handling in production."
          />
        )}

        {!isLoading && !isError && filteredEvents.length === 0 && (
          activeTab === "upcoming" && !search && typeFilter === "all" && dateFilter === "all" ? (
            <div className="border border-border bg-card p-8 text-center md:p-12">
              <p className="font-display text-xs uppercase tracking-[0.3em] text-accent">Between experiences</p>
              <h2 className="mt-3 font-display text-2xl text-foreground">The next event is being prepared.</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-foreground-secondary">There are no upcoming ticketed events at the moment. Explore Art Galore, revisit past experiences, or contact the team for updates.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button variant="outline" asChild><Link to="/about">About Art Galore</Link></Button>
                <Button variant="outline" asChild><Link to="/contact">Contact the team</Link></Button>
              </div>
            </div>
          ) : (
            <EmptyState title="No events found" description="Try a different filter, clear search, or switch between upcoming and past tabs." />
          )
        )}

        {!isLoading && !isError && filteredEvents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
