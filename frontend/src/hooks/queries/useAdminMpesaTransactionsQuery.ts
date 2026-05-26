import { useQuery } from "@tanstack/react-query";
import { listAdminMpesaTransactions, type AdminMpesaTransactionAuditFilters } from "@/api/endpoints/payments";
import { queryKeys } from "@/hooks/queryKeys";

export function useAdminMpesaTransactionsQuery(filters?: AdminMpesaTransactionAuditFilters) {
  return useQuery({
    queryKey: filters ? [...queryKeys.adminMpesaTransactions, filters] : queryKeys.adminMpesaTransactions,
    queryFn: () => listAdminMpesaTransactions(filters),
  });
}
