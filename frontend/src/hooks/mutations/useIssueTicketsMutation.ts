import { useMutation, useQueryClient } from "@tanstack/react-query";
import { issueTicketsForOrder } from "@/api/endpoints/tickets";
import { queryKeys } from "@/hooks/queryKeys";

export function useIssueTicketsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => issueTicketsForOrder(orderId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrder(result.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTicketEmailDelivery(result.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminManualPayments });
    },
  });
}
