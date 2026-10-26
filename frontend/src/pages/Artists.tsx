import { useMemo, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import FilterBar from "@/components/common/FilterBar";
import EmptyState from "@/components/common/EmptyState";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import ArtistCard from "@/components/cards/ArtistCard";
import { usePeopleQuery } from "@/hooks/queries/usePeopleQuery";
import { Button } from "@/components/ui/button";

export default function Artists() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [mediumFilter, setMediumFilter] = useState("all");

  const { data: people = [], isLoading, isError, refetch, isFetching } = usePeopleQuery();
  const artists = useMemo(() => people.filter((person) => person.isArtist), [people]);
  const mediumOptions = useMemo(() => {
    const uniqueMediums = Array.from(new Set(artists.map((artist) => artist.medium).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    );

    return [{ label: "All Mediums", value: "all" }, ...uniqueMediums.map((medium) => ({ label: medium, value: medium }))];
  }, [artists]);

  const filteredArtists = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return artists
      .filter((artist) => (categoryFilter === "all" ? true : artist.category === categoryFilter))
      .filter((artist) => (mediumFilter === "all" ? true : artist.medium === mediumFilter))
      .filter((artist) => {
        if (!normalizedSearch) return true;
        return (
          artist.name.toLowerCase().includes(normalizedSearch) ||
          artist.role.toLowerCase().includes(normalizedSearch) ||
          artist.medium.toLowerCase().includes(normalizedSearch) ||
          artist.bio.toLowerCase().includes(normalizedSearch) ||
          artist.featuredWorks.some((work) => work.toLowerCase().includes(normalizedSearch)) ||
          artist.eventsParticipated.some((event) => event.toLowerCase().includes(normalizedSearch))
        );
      });
  }, [artists, categoryFilter, mediumFilter, search]);

  return (
    <section className="section-padding">
      <div className="container-narrow space-y-6 md:space-y-8">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <PageHeader
            eyebrow="The Collective"
            title="Artists"
            description="Meet artist-members from the Art Galore International collective."
          />

          {!isLoading && !isError && (
            <div className="mb-10 rounded-md border border-border bg-secondary/20 px-4 py-3 text-sm text-foreground-secondary">
              <span className="font-display text-2xl text-foreground">{filteredArtists.length}</span>
              <span className="ml-2">{filteredArtists.length === 1 ? "profile" : "profiles"}</span>
            </div>
          )}
        </div>

        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search artists by name, role, or medium"
          filters={[
            {
              key: "category",
              label: "Category",
              value: categoryFilter,
              onChange: setCategoryFilter,
              options: [
                { label: "All", value: "all" },
                { label: "Leadership", value: "leadership" },
                { label: "Members", value: "member" },
              ],
            },
            {
              key: "medium",
              label: "Medium",
              value: mediumFilter,
              onChange: setMediumFilter,
              options: mediumOptions,
            },
          ]}
        />

        {isLoading && <LoadingSkeleton rows={6} />}

        {isError && (
          <EmptyState
            title="Could not load artists"
            description="We could not load artist profiles from the server. Please refresh and try again."
            action={<Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>{isFetching ? "Trying again..." : "Retry"}</Button>}
          />
        )}

        {!isLoading && !isError && filteredArtists.length === 0 && (
          <EmptyState
            title="No artists found"
            description="Try adjusting your search text or selected filters."
          />
        )}

        {!isLoading && !isError && filteredArtists.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredArtists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
