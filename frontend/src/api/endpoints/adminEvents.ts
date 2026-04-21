import { ApiError, apiRequest } from "@/api/client";
import type { EventLifecycle, EventRecord, RecordStatus, TicketTier } from "@/types/models";

type ApiData<T> = {
  data: T;
};

export type AdminEventsFilters = {
  search?: string;
  status?: RecordStatus;
};

export type AdminEventLineupInput = {
  personId?: string;
  name: string;
  role: string;
};

export type AdminEventUpsertInput = {
  title: string;
  slug?: string;
  type: string;
  summary?: string;
  description?: string;
  venue: string;
  startAt: string;
  endAt: string;
  timezone?: string;
  capacity?: number;
  status?: RecordStatus;
  lifecycle?: EventLifecycle;
  heroImage?: string;
  heroImageMeta?: EventRecord["heroImageMeta"];
  highlights?: string[];
  lineup?: AdminEventLineupInput[];
  supportedBy?: string[];
  displayOrder?: number;
};

export type AdminEventUpdateInput = Partial<AdminEventUpsertInput>;

export type AdminTicketTierUpsertInput = {
  name: string;
  slug?: string;
  description?: string;
  price: number;
  currency?: string;
  available: number;
  saleStartAt?: string;
  saleEndAt?: string;
  maxPerOrder?: number;
  displayOrder?: number;
  status?: RecordStatus;
  perks?: string[];
};

export type AdminTicketTierUpdateInput = Partial<AdminTicketTierUpsertInput>;

function mapRecordStatusToAdminStatus(status: RecordStatus | undefined) {
  if (!status) return undefined;
  return status;
}

function buildEventListPath(filters?: AdminEventsFilters) {
  if (!filters) return "/admin/events";

  const query = new URLSearchParams();

  if (filters.search) {
    query.set("search", filters.search);
  }

  const status = mapRecordStatusToAdminStatus(filters.status);
  if (status) {
    query.set("status", status);
  }

  const encoded = query.toString();
  return encoded ? `/admin/events?${encoded}` : "/admin/events";
}

export async function getAdminEvents(filters?: AdminEventsFilters) {
  const response = await apiRequest<ApiData<EventRecord[]>>(buildEventListPath(filters), {
    method: "GET",
  });

  return response.data;
}

export async function getAdminEventById(id: string) {
  try {
    const response = await apiRequest<ApiData<EventRecord>>(`/admin/events/${id}`, {
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

export async function createAdminEvent(input: AdminEventUpsertInput) {
  const response = await apiRequest<ApiData<EventRecord>>("/admin/events", {
    method: "POST",
    body: input,
  });

  return response.data;
}

export async function updateAdminEvent(id: string, input: AdminEventUpdateInput) {
  const response = await apiRequest<ApiData<EventRecord>>(`/admin/events/${id}`, {
    method: "PATCH",
    body: input,
  });

  return response.data;
}

export async function deleteAdminEvent(id: string) {
  await apiRequest<void>(`/admin/events/${id}`, {
    method: "DELETE",
  });
}

export async function getAdminTicketTiers(eventId: string) {
  const response = await apiRequest<ApiData<TicketTier[]>>(`/admin/events/${eventId}/ticket-tiers`, {
    method: "GET",
  });

  return response.data;
}

export async function createAdminTicketTier(eventId: string, input: AdminTicketTierUpsertInput) {
  const response = await apiRequest<ApiData<TicketTier>>(`/admin/events/${eventId}/ticket-tiers`, {
    method: "POST",
    body: input,
  });

  return response.data;
}

export async function updateAdminTicketTier(id: string, input: AdminTicketTierUpdateInput) {
  const response = await apiRequest<ApiData<TicketTier>>(`/admin/ticket-tiers/${id}`, {
    method: "PATCH",
    body: input,
  });

  return response.data;
}

export async function deleteAdminTicketTier(id: string) {
  await apiRequest<void>(`/admin/ticket-tiers/${id}`, {
    method: "DELETE",
  });
}
