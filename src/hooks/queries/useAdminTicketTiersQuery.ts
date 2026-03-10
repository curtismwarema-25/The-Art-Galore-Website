import { useQuery } from "@tanstack/react-query";
import { getAdminTicketTiers } from "@/api/endpoints/adminEvents";
import { queryKeys } from "@/hooks/queryKeys";

export function useAdminTicketTiersQuery(eventId: string) {
  return useQuery({
    queryKey: queryKeys.adminTicketTiers(eventId),
    queryFn: () => getAdminTicketTiers(eventId),
    enabled: Boolean(eventId),
  });
}
