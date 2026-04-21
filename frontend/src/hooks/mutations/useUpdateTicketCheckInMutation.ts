import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTicketCheckIn } from "@/api/endpoints/tickets";
import { queryKeys } from "@/hooks/queryKeys";
import type { CheckInStatus } from "@/types/models";

export function useUpdateTicketCheckInMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: CheckInStatus }) =>
      updateTicketCheckIn(ticketId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
    },
  });
}
