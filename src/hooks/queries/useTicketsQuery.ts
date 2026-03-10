import { useQuery } from "@tanstack/react-query";
import { getTickets } from "@/api/endpoints/tickets";
import { queryKeys } from "@/hooks/queryKeys";

export function useTicketsQuery() {
  return useQuery({
    queryKey: queryKeys.tickets,
    queryFn: getTickets,
  });
}
