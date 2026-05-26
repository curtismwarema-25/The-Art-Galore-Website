import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resendTicketEmailDelivery } from "@/api/endpoints/tickets";
import { queryKeys } from "@/hooks/queryKeys";

export function useResendTicketEmailDeliveryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => resendTicketEmailDelivery(orderId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrder(result.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTicketEmailDelivery(result.orderId) });
    },
  });
}
