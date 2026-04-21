import { useQuery } from "@tanstack/react-query";
import { getAdminOrderById, getAdminOrders, type AdminOrdersFilters } from "@/api/endpoints/orders";
import { queryKeys } from "@/hooks/queryKeys";

export function useAdminOrdersQuery(filters?: AdminOrdersFilters) {
  return useQuery({
    queryKey: filters ? [...queryKeys.adminOrders, filters] : queryKeys.adminOrders,
    queryFn: () => getAdminOrders(filters),
  });
}

export function useAdminOrderQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.adminOrder(id),
    queryFn: () => getAdminOrderById(id),
    enabled: Boolean(id),
  });
}
