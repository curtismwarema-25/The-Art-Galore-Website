import { useQuery } from "@tanstack/react-query";
import { getEventBySlug } from "@/api/endpoints/events";
import { queryKeys } from "@/hooks/queryKeys";

export function useEventQuery(slug: string) {
  return useQuery({
    queryKey: queryKeys.event(slug),
    queryFn: () => getEventBySlug(slug),
    enabled: Boolean(slug),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}
