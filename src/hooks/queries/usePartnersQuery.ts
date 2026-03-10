import { useQuery } from "@tanstack/react-query";
import { getPartners } from "@/api/endpoints/partners";
import { queryKeys } from "@/hooks/queryKeys";

export function usePartnersQuery() {
  return useQuery({
    queryKey: queryKeys.partners,
    queryFn: getPartners,
  });
}
