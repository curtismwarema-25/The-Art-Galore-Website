import { useMemo, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import FilterBar from "@/components/common/FilterBar";
import EmptyState from "@/components/common/EmptyState";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import ArtistCard from "@/components/cards/ArtistCard";
import { usePeopleQuery } from "@/hooks/queries/usePeopleQuery";

export default function Artists() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [mediumFilter, setMediumFilter] = useState("all");

  const { data: people = [], isLoading, isError } = usePeopleQuery();
  const artists = useMemo(() => people.filter((person) => person.isArtist), [people]);

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
          artist.medium.toLowerCase().includes(normalizedSearch)
        );
      });
  }, [artists, categoryFilter, mediumFilter, search]);

  return (
    <section className="section-padding">
      <div className="container-narrow space-y-6 md:space-y-8">
        <PageHeader
          eyebrow="The Collective"
          title="Artists"
          description="Meet artist-members from the Art Galore International collective."
        />

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
              options: [
                { label: "All Mediums", value: "all" },
                { label: "Mixed Media", value: "Mixed Media" },
                { label: "Painting", value: "Painting" },
                { label: "Community Facilitation", value: "Community Facilitation" },
                { label: "Creative Direction", value: "Creative Direction" },
              ],
            },
          ]}
        />

        {isLoading && <LoadingSkeleton rows={6} />}

        {isError && (
          <EmptyState
            title="Could not load artists"
            description="Artist listing error placeholder. Connect this state to backend/API failures."
          />
        )}

        {!isLoading && !isError && filteredArtists.length === 0 && (
          <EmptyState
            title="No artists found"
            description="Try adjusting your search text or selected filters."
          />
        )}

        {!isLoading && !isError && filteredArtists.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {filteredArtists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
