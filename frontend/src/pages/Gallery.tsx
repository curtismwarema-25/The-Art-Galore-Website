import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import PageHeader from "@/components/common/PageHeader";
import FilterBar from "@/components/common/FilterBar";
import EmptyState from "@/components/common/EmptyState";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import { useEventsQuery } from "@/hooks/queries/useEventsQuery";
import { useGalleryQuery } from "@/hooks/queries/useGalleryQuery";

export default function Gallery() {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  const { data: events = [], isLoading: isEventsLoading, isError: hasEventsError } = useEventsQuery();
  const { data: galleryImages = [], isLoading: isGalleryLoading, isError: hasGalleryError } = useGalleryQuery();
  const isLoading = isEventsLoading || isGalleryLoading;
  const hasError = hasEventsError || hasGalleryError;

  const filteredImages = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return galleryImages
      .filter((image) => (eventFilter === "all" ? true : image.eventId === eventFilter))
      .filter((image) => {
        if (!normalized) return true;
        const event = events.find((item) => item.id === image.eventId);
        return (
          image.caption.toLowerCase().includes(normalized) ||
          (event?.title.toLowerCase().includes(normalized) ?? false)
        );
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [eventFilter, events, galleryImages, search]);

  const selectedImage = filteredImages.find((image) => image.id === lightboxId);

  return (
    <section className="section-padding">
      <div className="container-narrow space-y-6 md:space-y-8">
        <PageHeader
          eyebrow="Archive"
          title="Gallery"
          description="Explore event galleries, archive moments, and community visual storytelling."
        />

        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by caption or event"
          filters={[
            {
              key: "event",
              label: "Event",
              value: eventFilter,
              onChange: setEventFilter,
              options: [
                { label: "All Events", value: "all" },
                ...events.map((event) => ({ label: event.title, value: event.id })),
              ],
            },
          ]}
        />

        {isLoading && <LoadingSkeleton rows={4} />}

        {hasError && (
          <EmptyState
            title="Gallery unavailable"
            description="We could not load gallery images from the server. Please refresh and try again."
          />
        )}

        {!isLoading && !hasError && filteredImages.length === 0 && (
          <EmptyState
            title="No gallery images found"
            description="Try another event filter or search term."
          />
        )}

        {!isLoading && !hasError && filteredImages.length > 0 && (
          <div className="columns-2 md:columns-3 gap-4 space-y-4">
            {filteredImages.map((image) => {
              const event = events.find((eventItem) => eventItem.id === image.eventId);
              return (
                <button
                  key={image.id}
                  onClick={() => setLightboxId(image.id)}
                  className="block w-full break-inside-avoid relative group"
                >
                  <img src={image.image} alt={image.caption} className="w-full object-cover" />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors duration-300 flex items-end p-3">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-left">
                      <p className="text-background font-display text-sm">{image.caption}</p>
                      <p className="text-background/75 text-xs">{event?.title}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4"
            onClick={() => setLightboxId(null)}
          >
            <button
              className="absolute top-4 right-4 text-background hover:text-accent transition-colors"
              onClick={() => setLightboxId(null)}
              aria-label="Close lightbox"
            >
              <X size={28} />
            </button>
            <div onClick={(event) => event.stopPropagation()} className="max-w-4xl w-full">
              <img src={selectedImage.image} alt={selectedImage.caption} className="w-full max-h-[78vh] object-contain" />
              <div className="mt-3 text-center">
                <p className="text-background font-display text-base">{selectedImage.caption}</p>
                <p className="text-background/75 text-sm">
                  {events.find((event) => event.id === selectedImage.eventId)?.title}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
