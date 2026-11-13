import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  const prefersReducedMotion = useReducedMotion();
  const lightboxTriggerRef = useRef<HTMLButtonElement | null>(null);
  const lightboxDialogRef = useRef<HTMLDivElement | null>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement | null>(null);

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

  const openLightbox = (trigger: HTMLButtonElement, imageId: string) => {
    lightboxTriggerRef.current = trigger;
    setLightboxId(imageId);
  };

  const closeLightbox = () => {
    setLightboxId(null);
    const trigger = lightboxTriggerRef.current;
    lightboxTriggerRef.current = null;
    if (trigger) {
      window.requestAnimationFrame(() => trigger.focus());
    }
  };

  useEffect(() => {
    if (!selectedImage) return;

    lightboxCloseRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = Array.from(
        lightboxDialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input, select, textarea",
        ) ?? [],
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage]);

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
                  type="button"
                  onClick={(event) => openLightbox(event.currentTarget, image.id)}
                  aria-label={`Open ${image.caption} in lightbox`}
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
            ref={lightboxDialogRef}
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
            className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4"
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gallery-lightbox-title"
          >
            <button
              ref={lightboxCloseRef}
              className="absolute top-4 right-4 text-background hover:text-accent transition-colors"
              type="button"
              onClick={closeLightbox}
              aria-label="Close lightbox"
            >
              <X size={28} />
            </button>
            <div onClick={(event) => event.stopPropagation()} className="max-w-4xl w-full">
              <img src={selectedImage.image} alt={selectedImage.caption} className="w-full max-h-[78vh] object-contain" />
              <div className="mt-3 text-center">
                <p id="gallery-lightbox-title" className="text-background font-display text-base">{selectedImage.caption}</p>
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
