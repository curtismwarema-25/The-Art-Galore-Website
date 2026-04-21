import { useQuery } from "@tanstack/react-query";
import { listAdminManualPaymentQueue, type AdminManualPaymentQueueFilters } from "@/api/endpoints/payments";
import { queryKeys } from "@/hooks/queryKeys";

export function useAdminManualPaymentsQuery(filters?: AdminManualPaymentQueueFilters) {
  return useQuery({
    queryKey: filters ? [...queryKeys.adminManualPayments, filters] : queryKeys.adminManualPayments,
    queryFn: () => listAdminManualPaymentQueue(filters),
  });
}
