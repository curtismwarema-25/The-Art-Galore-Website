import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createOrder, type CreateOrderInput } from "@/api/endpoints/orders";
import { queryKeys } from "@/hooks/queryKeys";

type CreateOrderMutationInput = {
  input: CreateOrderInput;
  idempotencyKey?: string;
};

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, idempotencyKey }: CreateOrderMutationInput) => createOrder(input, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders });
    },
  });
}
