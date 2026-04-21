import { FormEvent, useEffect, useMemo, useState } from "react";
import { PencilLine, Star, Trash2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import DataTable from "@/components/common/DataTable";
import EmptyState from "@/components/common/EmptyState";
import FilterBar from "@/components/common/FilterBar";
import SectionHeader from "@/components/common/SectionHeader";
import AdminSectionCard from "@/features/admin/shared/AdminSectionCard";
import {
  adminCheckboxClassName,
  adminCheckboxFieldClassName,
  adminFileInputClassName,
  adminInputClassName,
} from "@/features/admin/shared/utils";
import { useAuth } from "@/features/auth/AuthContext";
import { validateFile } from "@/features/uploads/uploadService";
import {
  useArchiveGalleryImageMutation,
  useCreateGalleryImageMutation,
  useUpdateGalleryImageMutation,
} from "@/hooks/mutations/useGalleryMutations";
import { useUploadMediaMutation } from "@/hooks/mutations/useUploadMediaMutation";
import { useAdminEventsQuery } from "@/hooks/queries/useAdminEventsQuery";
import { useAdminGalleryImageQuery, useAdminGalleryQuery } from "@/hooks/queries/useAdminGalleryQuery";
import type { GalleryImage, RecordStatus } from "@/types/models";
import { mediaUrlOrPathSchema } from "@/lib/validation/media";

type GalleryFormState = {
  eventId: string;
  caption: string;
  alt: string;
  featured: boolean;
  status: "published" | "archived";
  sortOrder: string;
};

type GalleryMediaState = {
  storageKey: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  url: string;
};

const galleryMediaSchema = z.object({
  storageKey: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(100),
  sizeBytes: z.number().int().nonnegative().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  url: mediaUrlOrPathSchema,
});

const galleryFormSchema = z.object({
  eventId: z.string().trim().min(1),
  caption: z.string().trim().min(2).max(255),
  alt: z.string().trim().max(255).optional(),
  featured: z.boolean(),
  status: z.enum(["published", "archived"]),
  sortOrder: z.string().optional(),
});

const defaultGalleryForm: GalleryFormState = {
  eventId: "",
  caption: "",
  alt: "",
  featured: false,
  status: "published",
  sortOrder: "",
};

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unexpected request error.";
}

function toOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mapGalleryToForm(image: GalleryImage): GalleryFormState {
  return {
    eventId: image.eventId,
    caption: image.caption,
    alt: image.media.alt ?? "",
    featured: image.featured,
    status: image.status === "archived" ? "archived" : "published",
    sortOrder: String(image.sortOrder),
  };
}

function mapGalleryToMedia(image: GalleryImage): GalleryMediaState | null {
  if (!image.media.storageKey || !image.media.mimeType || !image.image) {
    return null;
  }

  return {
    storageKey: image.media.storageKey,
    mimeType: image.media.mimeType,
    sizeBytes: image.media.sizeBytes,
    width: image.media.width,
    height: image.media.height,
    url: image.image,
  };
}

export default function AdminGalleriesPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole(["admin", "staff"]);

  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | RecordStatus>("all");
  const [selectedImageId, setSelectedImageId] = useState("");
  const [createForm, setCreateForm] = useState<GalleryFormState>(defaultGalleryForm);
  const [editForm, setEditForm] = useState<GalleryFormState>(defaultGalleryForm);
  const [createMedia, setCreateMedia] = useState<GalleryMediaState | null>(null);
  const [editMedia, setEditMedia] = useState<GalleryMediaState | null>(null);

  const adminEventsQuery = useAdminEventsQuery();
  const events = adminEventsQuery.data ?? [];

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      eventId: eventFilter === "all" ? undefined : eventFilter,
      featured: featuredFilter === "all" ? undefined : featuredFilter === "featured",
      status:
        statusFilter === "published" || statusFilter === "archived"
          ? statusFilter
          : undefined,
    }),
    [eventFilter, featuredFilter, search, statusFilter],
  );

  const galleryQuery = useAdminGalleryQuery(filters);
  const selectedImageQuery = useAdminGalleryImageQuery(selectedImageId);

  const createImageMutation = useCreateGalleryImageMutation();
  const updateImageMutation = useUpdateGalleryImageMutation();
  const archiveImageMutation = useArchiveGalleryImageMutation();
  const uploadMediaMutation = useUploadMediaMutation();

  const images = galleryQuery.data ?? [];
  const selectedImage = selectedImageQuery.data;

  useEffect(() => {
    if (!createForm.eventId && events[0]) {
      setCreateForm((current) => ({ ...current, eventId: events[0].id }));
    }
  }, [createForm.eventId, events]);

  useEffect(() => {
    if (!selectedImage) return;
    setEditForm(mapGalleryToForm(selectedImage));
    setEditMedia(mapGalleryToMedia(selectedImage));
  }, [selectedImage]);

  async function handleImageUpload(file: File, mode: "create" | "edit") {
    const validation = validateFile(file, "gallery");
    if (!validation.valid) {
      toast.error(validation.error ?? "Invalid image file.");
      return;
    }

    try {
      const uploaded = await uploadMediaMutation.mutateAsync({ file, target: "gallery" });
      const nextMedia = {
        storageKey: uploaded.storageKey,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        width: uploaded.width,
        height: uploaded.height,
        url: uploaded.url,
      };

      if (mode === "create") {
        setCreateMedia(nextMedia);
      } else {
        setEditMedia(nextMedia);
      }

      toast.success("Image uploaded.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  async function handleCreateImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      toast.error("You have read-only access for Gallery management.");
      return;
    }

    const parsed = galleryFormSchema.safeParse(createForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Complete required gallery fields.");
      return;
    }

    const parsedMedia = galleryMediaSchema.safeParse(createMedia);
    if (!parsedMedia.success) {
      toast.error(parsedMedia.error.issues[0]?.message ?? "Upload an image before creating gallery record.");
      return;
    }

    try {
      await createImageMutation.mutateAsync({
        eventId: parsed.data.eventId,
        caption: parsed.data.caption.trim(),
        featured: parsed.data.featured,
        status: parsed.data.status,
        sortOrder: toOptionalNumber(parsed.data.sortOrder),
        media: {
          storageKey: parsedMedia.data.storageKey,
          mimeType: parsedMedia.data.mimeType,
          sizeBytes: parsedMedia.data.sizeBytes,
          width: parsedMedia.data.width,
          height: parsedMedia.data.height,
          url: parsedMedia.data.url,
          alt: parsed.data.alt?.trim() || undefined,
        },
      });

      setCreateForm((current) => ({
        ...defaultGalleryForm,
        eventId: current.eventId,
      }));
      setCreateMedia(null);
      toast.success("Gallery image created.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  async function handleUpdateImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      toast.error("You have read-only access for Gallery management.");
      return;
    }

    if (!selectedImageId) return;

    const parsed = galleryFormSchema.safeParse(editForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Complete required gallery fields.");
      return;
    }

    const parsedMedia = editMedia ? galleryMediaSchema.safeParse(editMedia) : null;
    if (parsedMedia && !parsedMedia.success) {
      toast.error(parsedMedia.error.issues[0]?.message ?? "Upload a valid replacement image.");
      return;
    }

    try {
      await updateImageMutation.mutateAsync({
        id: selectedImageId,
        input: {
          eventId: parsed.data.eventId,
          caption: parsed.data.caption.trim(),
          featured: parsed.data.featured,
          status: parsed.data.status,
          sortOrder: toOptionalNumber(parsed.data.sortOrder),
          media: parsedMedia
            ? {
                storageKey: parsedMedia.data.storageKey,
                mimeType: parsedMedia.data.mimeType,
                sizeBytes: parsedMedia.data.sizeBytes,
                width: parsedMedia.data.width,
                height: parsedMedia.data.height,
                url: parsedMedia.data.url,
                alt: parsed.data.alt?.trim() || undefined,
              }
            : undefined,
        },
      });

      toast.success("Gallery image updated.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  async function handleArchiveImage(id: string) {
    if (!canWrite) {
      toast.error("You have read-only access for Gallery management.");
      return;
    }

    if (!window.confirm("Archive this gallery image?")) return;

    try {
      await archiveImageMutation.mutateAsync(id);
      toast.success("Gallery image archived.");

      if (selectedImageId === id) {
        setSelectedImageId("");
        setEditForm(defaultGalleryForm);
        setEditMedia(null);
      }
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  async function handleToggleFeatured(image: GalleryImage) {
    if (!canWrite) {
      toast.error("You have read-only access for Gallery management.");
      return;
    }

    try {
      await updateImageMutation.mutateAsync({
        id: image.id,
        input: {
          featured: !image.featured,
        },
      });
      toast.success("Featured state updated.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  if (galleryQuery.isLoading) {
    return <p className="text-sm text-foreground-secondary">Loading gallery assets...</p>;
  }

  if (galleryQuery.isError) {
    return <EmptyState title="Could not load gallery" description="Verify admin gallery endpoints and active session." />;
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <SectionHeader
        title="Gallery Manager"
        subtitle="Admin/staff can manage gallery metadata, event assignment, featured flags, and sort order. Moderators are read-only."
      />

      <AdminSectionCard title="Create Gallery Image Record">
        {!canWrite && <p className="text-sm text-foreground-secondary mb-4">Your role is read-only for this section.</p>}
        <form onSubmit={handleCreateImage} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            className={adminInputClassName}
            value={createForm.eventId}
            onChange={(event) => setCreateForm((current) => ({ ...current, eventId: event.target.value }))}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>
          <input value={createForm.caption} onChange={(event) => setCreateForm((current) => ({ ...current, caption: event.target.value }))} className={adminInputClassName} placeholder="Caption" />
          <div className="md:col-span-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={adminFileInputClassName}
              disabled={!canWrite || uploadMediaMutation.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void handleImageUpload(file, "create");
              }}
            />
            <p className="mt-1 text-xs text-foreground-secondary">
              {uploadMediaMutation.isPending
                ? "Uploading image..."
                : createMedia?.storageKey
                  ? "Image upload ready."
                  : "Upload image before creating gallery record."}
            </p>
          </div>
          <input value={createMedia?.url ?? ""} readOnly className={adminInputClassName} placeholder="Image URL (auto)" />
          <input value={createMedia?.storageKey ?? ""} readOnly className={adminInputClassName} placeholder="Storage key (auto)" />
          <input value={createMedia?.mimeType ?? ""} readOnly className={adminInputClassName} placeholder="Mime type (auto)" />
          <input value={createForm.alt} onChange={(event) => setCreateForm((current) => ({ ...current, alt: event.target.value }))} className={adminInputClassName} placeholder="Alt text (optional)" />
          <input value={createForm.sortOrder} onChange={(event) => setCreateForm((current) => ({ ...current, sortOrder: event.target.value }))} className={adminInputClassName} placeholder="Sort order" />
          <select value={createForm.status} onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value as GalleryFormState["status"] }))} className={adminInputClassName}>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <input value={createMedia?.sizeBytes ? String(createMedia.sizeBytes) : ""} readOnly className={adminInputClassName} placeholder="Size bytes (auto)" />
          <input value={createMedia?.width ? String(createMedia.width) : ""} readOnly className={adminInputClassName} placeholder="Width (auto)" />
          <input value={createMedia?.height ? String(createMedia.height) : ""} readOnly className={adminInputClassName} placeholder="Height (auto)" />
          <label className={adminCheckboxFieldClassName}>
            <input type="checkbox" checked={createForm.featured} onChange={(event) => setCreateForm((current) => ({ ...current, featured: event.target.checked }))} className={adminCheckboxClassName} />
            Featured image
          </label>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" variant="accent" disabled={!canWrite || createImageMutation.isPending}>
              {createImageMutation.isPending ? "Saving..." : "Create Image Record"}
            </Button>
          </div>
        </form>
      </AdminSectionCard>

      <AdminSectionCard title="Gallery Images">
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
              options: [{ label: "All Events", value: "all" }].concat(
                events.map((event) => ({ label: event.title, value: event.id })),
              ),
            },
            {
              key: "featured",
              label: "Featured",
              value: featuredFilter,
              onChange: setFeaturedFilter,
              options: [
                { label: "All", value: "all" },
                { label: "Featured", value: "featured" },
                { label: "Not Featured", value: "plain" },
              ],
            },
            {
              key: "status",
              label: "Status",
              value: statusFilter,
              onChange: (value) => setStatusFilter(value as "all" | RecordStatus),
              options: [
                { label: "All", value: "all" },
                { label: "Published", value: "published" },
                { label: "Archived", value: "archived" },
              ],
            },
          ]}
        />

        <div className="mt-4">
          {images.length === 0 ? (
            <EmptyState title="No gallery images" description="Create gallery image records to populate this section." />
          ) : (
            <DataTable headers={["Preview", "Event", "Caption", "Sort", "Featured", "Actions"]} minWidthClassName="min-w-[760px] md:min-w-[980px]">
              {images.map((image) => (
                <tr key={image.id} className="bg-background border border-border">
                  <td className="px-3 py-3">
                    <img src={image.image} alt={image.caption} className="h-14 w-14 object-cover rounded-sm" />
                  </td>
                  <td className="px-3 py-3 text-sm text-foreground-secondary">
                    {events.find((event) => event.id === image.eventId)?.title ?? image.eventId}
                  </td>
                  <td className="px-3 py-3 text-sm text-foreground-secondary">{image.caption}</td>
                  <td className="px-3 py-3 text-sm text-foreground-secondary">{image.sortOrder}</td>
                  <td className="px-3 py-3">
                    <Button type="button" variant="outline" size="sm" onClick={() => handleToggleFeatured(image)} disabled={!canWrite || updateImageMutation.isPending}>
                      <Star size={12} /> {image.featured ? "Featured" : "Feature"}
                    </Button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedImageId(image.id)}>
                        <PencilLine size={12} /> Edit
                      </Button>
                      {canWrite && (
                        <Button type="button" variant="outline" size="sm" onClick={() => handleArchiveImage(image.id)} disabled={archiveImageMutation.isPending}>
                          <Trash2 size={12} /> Archive
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      </AdminSectionCard>

      {selectedImageId && (
        <AdminSectionCard title="Edit Gallery Image">
          {selectedImageQuery.isLoading ? (
            <p className="text-sm text-foreground-secondary">Loading gallery image details...</p>
          ) : selectedImageQuery.isError || !selectedImage ? (
            <EmptyState title="Could not load gallery image" description="Select another image and retry." />
          ) : (
            <form onSubmit={handleUpdateImage} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                className={adminInputClassName}
                value={editForm.eventId}
                onChange={(event) => setEditForm((current) => ({ ...current, eventId: event.target.value }))}
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.title}</option>
                ))}
              </select>
              <input value={editForm.caption} onChange={(event) => setEditForm((current) => ({ ...current, caption: event.target.value }))} className={adminInputClassName} placeholder="Caption" />
              <div className="md:col-span-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className={adminFileInputClassName}
                  disabled={!canWrite || uploadMediaMutation.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void handleImageUpload(file, "edit");
                  }}
                />
                <p className="mt-1 text-xs text-foreground-secondary">
                  {uploadMediaMutation.isPending
                    ? "Uploading image..."
                    : editMedia?.storageKey
                      ? "Image upload ready."
                      : "Upload image to replace existing asset."}
                </p>
              </div>
              <input value={editMedia?.url ?? ""} readOnly className={adminInputClassName} placeholder="Image URL (auto)" />
              <input value={editMedia?.storageKey ?? ""} readOnly className={adminInputClassName} placeholder="Storage key (auto)" />
              <input value={editMedia?.mimeType ?? ""} readOnly className={adminInputClassName} placeholder="Mime type (auto)" />
              <input value={editForm.alt} onChange={(event) => setEditForm((current) => ({ ...current, alt: event.target.value }))} className={adminInputClassName} placeholder="Alt text" />
              <input value={editForm.sortOrder} onChange={(event) => setEditForm((current) => ({ ...current, sortOrder: event.target.value }))} className={adminInputClassName} placeholder="Sort order" />
              <select value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value as GalleryFormState["status"] }))} className={adminInputClassName}>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <input value={editMedia?.sizeBytes ? String(editMedia.sizeBytes) : ""} readOnly className={adminInputClassName} placeholder="Size bytes (auto)" />
              <input value={editMedia?.width ? String(editMedia.width) : ""} readOnly className={adminInputClassName} placeholder="Width (auto)" />
              <input value={editMedia?.height ? String(editMedia.height) : ""} readOnly className={adminInputClassName} placeholder="Height (auto)" />
              <label className={adminCheckboxFieldClassName}>
                <input type="checkbox" checked={editForm.featured} onChange={(event) => setEditForm((current) => ({ ...current, featured: event.target.checked }))} className={adminCheckboxClassName} />
                Featured image
              </label>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setSelectedImageId(""); setEditForm(defaultGalleryForm); setEditMedia(null); }}>Cancel</Button>
                <Button type="submit" variant="accent" disabled={!canWrite || updateImageMutation.isPending}>
                  {updateImageMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </AdminSectionCard>
      )}
    </div>
  );
}
