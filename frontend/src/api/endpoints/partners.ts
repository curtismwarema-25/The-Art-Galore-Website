import { apiRequest } from "@/api/client";
import type { PartnerRecord } from "@/types/models";

type ApiData<T> = {
  data: T;
};

export async function getPartners() {
  const response = await apiRequest<ApiData<PartnerRecord[]>>("/partners", {
    method: "GET",
  });

  return response.data;
}

export async function getPartnerBySlug(slug: string) {
  const partners = await getPartners();
  return partners.find((partner) => partner.slug === slug) ?? null;
}
