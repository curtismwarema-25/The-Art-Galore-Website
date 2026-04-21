import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSiteSettings } from "@/api/endpoints/settings";
import { queryKeys } from "@/hooks/queryKeys";

export function useUpdateSiteSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSiteSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSiteSettings });
      queryClient.invalidateQueries({ queryKey: queryKeys.publicSettings });
    },
  });
}
