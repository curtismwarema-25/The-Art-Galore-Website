import { useQuery } from "@tanstack/react-query";
import { getAdminEventById, getAdminEvents, type AdminEventsFilters } from "@/api/endpoints/adminEvents";
import { queryKeys } from "@/hooks/queryKeys";

export function useAdminEventsQuery(filters?: AdminEventsFilters) {
  return useQuery({
    queryKey: filters ? [...queryKeys.adminEvents, filters] : queryKeys.adminEvents,
    queryFn: () => getAdminEvents(filters),
  });
}

export function useAdminEventQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.adminEvent(id),
    queryFn: () => getAdminEventById(id),
    enabled: Boolean(id),
  });
}
