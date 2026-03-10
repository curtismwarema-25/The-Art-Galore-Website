import { useQuery } from "@tanstack/react-query";
import { getTicketById } from "@/api/endpoints/tickets";
import { queryKeys } from "@/hooks/queryKeys";

export function useTicketQuery(ticketId: string) {
  return useQuery({
    queryKey: queryKeys.ticket(ticketId),
    queryFn: () => getTicketById(ticketId),
    enabled: Boolean(ticketId),
  });
}
