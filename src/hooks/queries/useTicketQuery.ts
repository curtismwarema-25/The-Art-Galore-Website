import { useQuery } from "@tanstack/react-query";
import { getTicketById } from "@/api/endpoints/tickets";
import { queryKeys } from "@/hooks/queryKeys";

export function useTicketQuery(publicTicketToken: string) {
  return useQuery({
    queryKey: queryKeys.ticket(publicTicketToken),
    queryFn: () => getTicketById(publicTicketToken),
    enabled: Boolean(publicTicketToken),
  });
}
