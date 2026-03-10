import { useQuery } from "@tanstack/react-query";
import {
  getAdminGalleryImageById,
  getAdminGalleryImages,
  type AdminGalleryFilters,
} from "@/api/endpoints/adminGallery";
import { queryKeys } from "@/hooks/queryKeys";

export function useAdminGalleryQuery(filters?: AdminGalleryFilters) {
  return useQuery({
    queryKey: filters ? [...queryKeys.adminGallery, filters] : queryKeys.adminGallery,
    queryFn: () => getAdminGalleryImages(filters),
  });
}

export function useAdminGalleryImageQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.adminGalleryImage(id),
    queryFn: () => getAdminGalleryImageById(id),
    enabled: Boolean(id),
  });
}
