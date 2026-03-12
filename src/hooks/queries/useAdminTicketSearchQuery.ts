import { useQuery } from "@tanstack/react-query";
import { searchTickets, type AdminTicketSearchFilters } from "@/api/endpoints/tickets";
import { queryKeys } from "@/hooks/queryKeys";

export function useAdminTicketSearchQuery(filters: AdminTicketSearchFilters, enabled = true) {
  return useQuery({
    queryKey: [
      ...queryKeys.adminTicketSearch(filters.query, filters.eventId),
      filters.ticketStatus ?? "",
      filters.limit ?? "",
    ],
    queryFn: () => searchTickets(filters),
    enabled: enabled && Boolean(filters.query.trim()),
  });
}
