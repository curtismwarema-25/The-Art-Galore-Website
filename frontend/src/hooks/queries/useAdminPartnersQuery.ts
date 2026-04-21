import { useQuery } from "@tanstack/react-query";
import { getAdminPartnerById, getAdminPartners, type AdminPartnersFilters } from "@/api/endpoints/adminPartners";
import { queryKeys } from "@/hooks/queryKeys";

export function useAdminPartnersQuery(filters?: AdminPartnersFilters) {
  return useQuery({
    queryKey: filters ? [...queryKeys.adminPartners, filters] : queryKeys.adminPartners,
    queryFn: () => getAdminPartners(filters),
  });
}

export function useAdminPartnerQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.adminPartner(id),
    queryFn: () => getAdminPartnerById(id),
    enabled: Boolean(id),
  });
}
