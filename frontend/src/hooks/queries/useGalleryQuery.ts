import { useQuery } from "@tanstack/react-query";
import { getGalleryImages } from "@/api/endpoints/gallery";
import { queryKeys } from "@/hooks/queryKeys";

export function useGalleryQuery() {
  return useQuery({
    queryKey: queryKeys.gallery,
    queryFn: getGalleryImages,
  });
}
