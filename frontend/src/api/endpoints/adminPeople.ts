import { ApiError, apiRequest } from "@/api/client";
import type { PersonCategory, PersonRecord, RecordStatus } from "@/types/models";

type ApiData<T> = {
  data: T;
};

export type AdminPeopleScope = "all" | "artists" | "team";

export type AdminPeopleFilters = {
  search?: string;
  scope?: AdminPeopleScope;
  status?: RecordStatus;
};

export type AdminPersonEventParticipationInput = {
  eventId: string;
  participationRole?: string;
};

export type AdminPersonUpsertInput = {
  name: string;
  slug?: string;
  role: string;
  category: PersonCategory;
  isArtist: boolean;
  bio: string;
  medium?: string;
  image?: string;
  imageMeta?: PersonRecord["imageMeta"];
  coverImage?: string;
  coverImageMeta?: PersonRecord["coverImageMeta"];
  status?: RecordStatus;
  displayOrder?: number;
  featuredWorks?: string[];
  eventParticipations?: AdminPersonEventParticipationInput[];
};

export type AdminPersonUpdateInput = Partial<AdminPersonUpsertInput>;

function mapStatusFilter(status?: RecordStatus) {
  if (!status || status === "cancelled") return undefined;
  return status;
}

function buildAdminPeoplePath(filters?: AdminPeopleFilters) {
  if (!filters) return "/admin/people";

  const query = new URLSearchParams();

  if (filters.search) {
    query.set("search", filters.search);
  }

  if (filters.scope) {
    query.set("scope", filters.scope);
  }

  const status = mapStatusFilter(filters.status);
  if (status) {
    query.set("status", status);
  }

  const encoded = query.toString();
  return encoded ? `/admin/people?${encoded}` : "/admin/people";
}

export async function getAdminPeople(filters?: AdminPeopleFilters) {
  const response = await apiRequest<ApiData<PersonRecord[]>>(buildAdminPeoplePath(filters), {
    method: "GET",
  });

  return response.data;
}

export async function getAdminPersonById(id: string) {
  try {
    const response = await apiRequest<ApiData<PersonRecord>>(`/admin/people/${id}`, {
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

export async function createAdminPerson(input: AdminPersonUpsertInput) {
  const response = await apiRequest<ApiData<PersonRecord>>("/admin/people", {
    method: "POST",
    body: input,
  });

  return response.data;
}

export async function updateAdminPerson(id: string, input: AdminPersonUpdateInput) {
  const response = await apiRequest<ApiData<PersonRecord>>(`/admin/people/${id}`, {
    method: "PATCH",
    body: input,
  });

  return response.data;
}

export async function archiveAdminPerson(id: string) {
  await apiRequest<void>(`/admin/people/${id}`, {
    method: "DELETE",
  });
}
