import { useQuery } from "@tanstack/react-query";
import { getAdminSiteSettings } from "@/api/endpoints/settings";
import { queryKeys } from "@/hooks/queryKeys";

export function useAdminSiteSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.adminSiteSettings,
    queryFn: getAdminSiteSettings,
  });
}
