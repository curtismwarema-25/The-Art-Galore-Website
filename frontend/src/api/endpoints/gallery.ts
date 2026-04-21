import { apiRequest } from "@/api/client";
import type { GalleryImage } from "@/types/models";

type ApiData<T> = {
  data: T;
};

export async function getGalleryImages() {
  const response = await apiRequest<ApiData<GalleryImage[]>>("/gallery-images", {
    method: "GET",
  });

  return response.data;
}

export async function getGalleryImagesByEvent(eventId: string) {
  const response = await apiRequest<ApiData<GalleryImage[]>>(`/gallery-images?eventId=${encodeURIComponent(eventId)}`, {
    method: "GET",
  });

  return response.data;
}
