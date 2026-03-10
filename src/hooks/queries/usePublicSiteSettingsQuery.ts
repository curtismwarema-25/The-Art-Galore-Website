import { useQuery } from "@tanstack/react-query";
import { getPublicSiteSettings } from "@/api/endpoints/settings";
import { queryKeys } from "@/hooks/queryKeys";

export function usePublicSiteSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.publicSettings,
    queryFn: getPublicSiteSettings,
  });
}
