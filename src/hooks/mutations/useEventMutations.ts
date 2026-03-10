import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAdminEvent,
  deleteAdminEvent,
  updateAdminEvent,
  type AdminEventUpdateInput,
  type AdminEventUpsertInput,
} from "@/api/endpoints/adminEvents";
import { queryKeys } from "@/hooks/queryKeys";

export function useCreateEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminEventUpsertInput) => createAdminEvent(input),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEvents });
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      queryClient.setQueryData(queryKeys.adminEvent(created.id), created);
    },
  });
}

export function useUpdateEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminEventUpdateInput }) => updateAdminEvent(id, input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEvents });
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      queryClient.setQueryData(queryKeys.adminEvent(updated.id), updated);
    },
  });
}

export function useDeleteEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminEvent(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEvents });
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      queryClient.removeQueries({ queryKey: queryKeys.adminEvent(id) });
    },
  });
}
