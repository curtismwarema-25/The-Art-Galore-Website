import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "@/api/endpoints/auth";
import { queryKeys } from "@/hooks/queryKeys";

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.currentUser, null);
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    },
  });
}
