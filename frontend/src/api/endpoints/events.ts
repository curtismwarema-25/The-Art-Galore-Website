import { ApiError, apiRequest } from "@/api/client";
import type { CommunityUpload, EventRecord, GalleryImage, TicketTier } from "@/types/models";

type ApiData<T> = {
  data: T;
};

export type EventDetailRecord = EventRecord & {
  ticketTiers: TicketTier[];
  galleryImages: GalleryImage[];
  approvedUploads: CommunityUpload[];
};

export async function getEvents() {
  const response = await apiRequest<ApiData<EventRecord[]>>("/events", {
    method: "GET",
  });

  return response.data;
}

export async function getEventBySlug(slug: string) {
  try {
    const response = await apiRequest<ApiData<EventDetailRecord>>(`/events/${slug}`, {
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
