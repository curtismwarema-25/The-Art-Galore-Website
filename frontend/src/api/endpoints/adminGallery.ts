import { ApiError, apiRequest } from "@/api/client";
import type { GalleryImage, RecordStatus } from "@/types/models";

type ApiData<T> = {
  data: T;
};

export type AdminGalleryFilters = {
  eventId?: string;
  search?: string;
  featured?: boolean;
  status?: Extract<RecordStatus, "published" | "archived">;
};

export type AdminGalleryMediaInput = {
  storageKey: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  url: string;
  alt?: string;
};

export type AdminGalleryImageUpsertInput = {
  eventId: string;
  caption: string;
  featured?: boolean;
  sortOrder?: number;
  status?: Extract<RecordStatus, "published" | "archived">;
  media: AdminGalleryMediaInput;
};

export type AdminGalleryImageUpdateInput = Partial<AdminGalleryImageUpsertInput>;

function buildAdminGalleryPath(filters?: AdminGalleryFilters) {
  if (!filters) return "/admin/gallery-images";

  const query = new URLSearchParams();

  if (filters.eventId) query.set("eventId", filters.eventId);
  if (filters.search) query.set("search", filters.search);
  if (filters.featured !== undefined) query.set("featured", String(filters.featured));
  if (filters.status) query.set("status", filters.status);

  const encoded = query.toString();
  return encoded ? `/admin/gallery-images?${encoded}` : "/admin/gallery-images";
}

export async function getAdminGalleryImages(filters?: AdminGalleryFilters) {
  const response = await apiRequest<ApiData<GalleryImage[]>>(buildAdminGalleryPath(filters), {
    method: "GET",
  });

  return response.data;
}

export async function getAdminGalleryImageById(id: string) {
  try {
    const response = await apiRequest<ApiData<GalleryImage>>(`/admin/gallery-images/${id}`, {
      method: "GET",
    });

    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function createAdminGalleryImage(input: AdminGalleryImageUpsertInput) {
  const response = await apiRequest<ApiData<GalleryImage>>("/admin/gallery-images", {
    method: "POST",
    body: input,
  });

  return response.data;
}

export async function updateAdminGalleryImage(id: string, input: AdminGalleryImageUpdateInput) {
  const response = await apiRequest<ApiData<GalleryImage>>(`/admin/gallery-images/${id}`, {
    method: "PATCH",
    body: input,
  });

  return response.data;
}

export async function archiveAdminGalleryImage(id: string) {
  await apiRequest<void>(`/admin/gallery-images/${id}`, {
    method: "DELETE",
  });
}
