import { useQuery } from "@tanstack/react-query";
import { getAdminCommunityUploads } from "@/api/endpoints/uploads";
import { queryKeys } from "@/hooks/queryKeys";

export function useUploadsQuery() {
  return useQuery({
    queryKey: queryKeys.adminUploads,
    queryFn: () => getAdminCommunityUploads(),
  });
}
