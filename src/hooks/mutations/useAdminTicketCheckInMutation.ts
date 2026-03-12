import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkInTicket, type AdminTicketCheckInInput } from "@/api/endpoints/tickets";
import { queryKeys } from "@/hooks/queryKeys";

export function useAdminTicketCheckInMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminTicketCheckInInput) => checkInTicket(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminManualPayments });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders });
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
    },
  });
}
