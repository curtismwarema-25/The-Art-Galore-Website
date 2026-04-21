import { useQuery } from "@tanstack/react-query";
import { getOrders, getOrderById } from "@/api/endpoints/orders";
import { queryKeys } from "@/hooks/queryKeys";

export function useOrdersQuery() {
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: getOrders,
  });
}

export function useOrderQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => getOrderById(id),
    enabled: Boolean(id),
  });
}
