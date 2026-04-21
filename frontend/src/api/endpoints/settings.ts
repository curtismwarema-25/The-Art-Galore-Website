import { apiRequest } from "@/api/client";
import type { SiteSettings } from "@/types/models";

type ApiData<T> = {
  data: T;
};

export type AdminSiteSettingsUpdateInput = Partial<
  Omit<SiteSettings, "id" | "slug" | "status" | "displayOrder" | "createdAt" | "updatedAt">
>;

export async function getAdminSiteSettings() {
  const response = await apiRequest<ApiData<SiteSettings>>("/admin/site-settings", {
    method: "GET",
  });

  return response.data;
}

export async function getPublicSiteSettings() {
  const response = await apiRequest<ApiData<SiteSettings>>("/site-settings/public", {
    method: "GET",
  });

  return response.data;
}

export async function updateSiteSettings(input: AdminSiteSettingsUpdateInput) {
  const response = await apiRequest<ApiData<SiteSettings>>("/admin/site-settings", {
    method: "PATCH",
    body: input,
  });

  return response.data;
}
