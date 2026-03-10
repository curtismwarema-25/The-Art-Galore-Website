import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/api/endpoints/auth";
import { queryKeys } from "@/hooks/queryKeys";

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: getCurrentUser,
    retry: false,
  });
}
