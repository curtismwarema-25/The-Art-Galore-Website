import { ApiError, apiRequest } from "@/api/client";
import type { CommunityUpload, ModerationStatus } from "@/types/models";

type ApiData<T> = {
  data: T;
};

export type CommunityUploadMediaInput = {
  storageKey: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  url: string;
};

export type SubmitCommunityUploadInput = {
  eventId: string;
  alias: string;
  submitterEmail?: string;
  submitterPhone?: string;
  consentGiven?: boolean;
  media: CommunityUploadMediaInput;
};

export type AdminUploadsFilters = {
  eventId?: string;
  status?: ModerationStatus;
  search?: string;
};

export type ModerateCommunityUploadInput = {
  decision: Exclude<ModerationStatus, "pending">;
  notes?: string;
};

function buildQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (!value) return;
    query.set(key, value);
  });

  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}

export async function getApprovedCommunityUploads(filters?: { eventId?: string }) {
  const suffix = buildQuery({
    eventId: filters?.eventId,
  });

  const response = await apiRequest<ApiData<CommunityUpload[]>>(`/community-uploads${suffix}`, {
    method: "GET",
  });

  return response.data;
}

export async function submitCommunityUpload(input: SubmitCommunityUploadInput) {
  const response = await apiRequest<ApiData<CommunityUpload>>("/community-uploads", {
    method: "POST",
    body: input,
  });

  return response.data;
}

export async function getAdminCommunityUploads(filters?: AdminUploadsFilters) {
  const suffix = buildQuery({
    eventId: filters?.eventId,
    status: filters?.status,
    search: filters?.search,
  });

  const response = await apiRequest<ApiData<CommunityUpload[]>>(`/admin/community-uploads${suffix}`, {
    method: "GET",
  });

  return response.data;
}

export async function getAdminCommunityUploadById(id: string) {
  try {
    const response = await apiRequest<ApiData<CommunityUpload>>(`/admin/community-uploads/${id}`, {
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

export async function moderateCommunityUpload(uploadId: string, input: ModerateCommunityUploadInput) {
  const response = await apiRequest<ApiData<CommunityUpload>>(`/admin/community-uploads/${uploadId}/status`, {
    method: "PATCH",
    body: input,
  });

  return response.data;
}

export async function deleteCommunityUpload(uploadId: string) {
  await apiRequest<void>(`/admin/community-uploads/${uploadId}`, {
    method: "DELETE",
  });
}
