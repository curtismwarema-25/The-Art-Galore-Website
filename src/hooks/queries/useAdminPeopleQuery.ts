import { useQuery } from "@tanstack/react-query";
import { getAdminPeople, getAdminPersonById, type AdminPeopleFilters } from "@/api/endpoints/adminPeople";
import { queryKeys } from "@/hooks/queryKeys";

export function useAdminPeopleQuery(filters?: AdminPeopleFilters) {
  return useQuery({
    queryKey: filters ? [...queryKeys.adminPeople, filters] : queryKeys.adminPeople,
    queryFn: () => getAdminPeople(filters),
  });
}

export function useAdminPersonQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.adminPerson(id),
    queryFn: () => getAdminPersonById(id),
    enabled: Boolean(id),
  });
}
