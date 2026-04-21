import { ApiError, apiRequest } from "@/api/client";
import type { PartnerRecord, RecordStatus } from "@/types/models";

type ApiData<T> = {
  data: T;
};

export type AdminPartnersFilters = {
  search?: string;
  status?: RecordStatus;
  homepageOnly?: boolean;
};

export type AdminPartnerUpsertInput = {
  name: string;
  slug?: string;
  status?: RecordStatus;
  description: string;
  partnershipType?: string;
  website?: string;
  logoText?: string;
  logoMeta?: PartnerRecord["logoMeta"];
  showOnHomepage?: boolean;
  displayOrder?: number;
};

export type AdminPartnerUpdateInput = Partial<AdminPartnerUpsertInput>;

function mapStatusFilter(status?: RecordStatus) {
  if (!status || status === "cancelled") return undefined;
  return status;
}

function buildAdminPartnersPath(filters?: AdminPartnersFilters) {
  if (!filters) return "/admin/partners";

  const query = new URLSearchParams();

  if (filters.search) {
    query.set("search", filters.search);
  }

  const status = mapStatusFilter(filters.status);
  if (status) {
    query.set("status", status);
  }

  if (filters.homepageOnly !== undefined) {
    query.set("homepageOnly", String(filters.homepageOnly));
  }

  const encoded = query.toString();
  return encoded ? `/admin/partners?${encoded}` : "/admin/partners";
}

export async function getAdminPartners(filters?: AdminPartnersFilters) {
  const response = await apiRequest<ApiData<PartnerRecord[]>>(buildAdminPartnersPath(filters), {
    method: "GET",
  });

  return response.data;
}

export async function getAdminPartnerById(id: string) {
  try {
    const response = await apiRequest<ApiData<PartnerRecord>>(`/admin/partners/${id}`, {
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

export async function createAdminPartner(input: AdminPartnerUpsertInput) {
  const response = await apiRequest<ApiData<PartnerRecord>>("/admin/partners", {
    method: "POST",
    body: input,
  });

  return response.data;
}

export async function updateAdminPartner(id: string, input: AdminPartnerUpdateInput) {
  const response = await apiRequest<ApiData<PartnerRecord>>(`/admin/partners/${id}`, {
    method: "PATCH",
    body: input,
  });

  return response.data;
}

export async function archiveAdminPartner(id: string) {
  await apiRequest<void>(`/admin/partners/${id}`, {
    method: "DELETE",
  });
}
