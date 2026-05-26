import { useQuery } from "@tanstack/react-query";
import { getTicketEmailDeliverySummary } from "@/api/endpoints/tickets";
import { queryKeys } from "@/hooks/queryKeys";

export function useAdminTicketEmailDeliveryQuery(orderId: string) {
  return useQuery({
    queryKey: queryKeys.adminTicketEmailDelivery(orderId),
    queryFn: () => getTicketEmailDeliverySummary(orderId),
    enabled: Boolean(orderId),
  });
}
