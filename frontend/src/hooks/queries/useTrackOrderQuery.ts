import { useQuery } from "@tanstack/react-query";
import { trackOrder } from "@/api/endpoints/orders";
import { queryKeys } from "@/hooks/queryKeys";

export function useTrackOrderQuery(publicToken: string, refetchInterval = 30_000) {
  return useQuery({
    queryKey: queryKeys.trackedOrder(publicToken),
    queryFn: () => trackOrder(publicToken),
    enabled: Boolean(publicToken),
    refetchInterval,
  });
}
