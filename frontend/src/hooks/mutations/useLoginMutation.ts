import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, type LoginInput } from "@/api/endpoints/auth";
import { queryKeys } from "@/hooks/queryKeys";

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.currentUser, result.user);
    },
  });
}
