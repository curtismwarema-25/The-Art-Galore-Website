import { useQuery } from "@tanstack/react-query";
import { getAdminStats } from "@/api/endpoints/adminStats";
import { queryKeys } from "@/hooks/queryKeys";

export function useAdminStatsQuery() {
  return useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: getAdminStats,
  });
}
