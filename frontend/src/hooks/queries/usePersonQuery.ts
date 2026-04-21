import { useQuery } from "@tanstack/react-query";
import { getPersonBySlug } from "@/api/endpoints/people";
import { queryKeys } from "@/hooks/queryKeys";

export function usePersonQuery(slug: string) {
  return useQuery({
    queryKey: queryKeys.person(slug),
    queryFn: () => getPersonBySlug(slug),
    enabled: Boolean(slug),
  });
}
