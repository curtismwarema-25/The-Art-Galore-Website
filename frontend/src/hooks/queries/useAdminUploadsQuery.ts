import { useQuery } from "@tanstack/react-query";
import {
  getAdminCommunityUploadById,
  getAdminCommunityUploads,
  type AdminUploadsFilters,
} from "@/api/endpoints/uploads";
import { queryKeys } from "@/hooks/queryKeys";

export function useAdminUploadsQuery(filters?: AdminUploadsFilters) {
  return useQuery({
    queryKey: filters ? [...queryKeys.adminUploads, filters] : queryKeys.adminUploads,
    queryFn: () => getAdminCommunityUploads(filters),
  });
}

export function useAdminUploadQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.adminUpload(id),
    queryFn: () => getAdminCommunityUploadById(id),
    enabled: Boolean(id),
  });
}
