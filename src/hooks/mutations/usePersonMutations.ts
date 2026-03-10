import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  archiveAdminPerson,
  createAdminPerson,
  updateAdminPerson,
  type AdminPersonUpdateInput,
  type AdminPersonUpsertInput,
} from "@/api/endpoints/adminPeople";
import { queryKeys } from "@/hooks/queryKeys";

export function useCreatePersonMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPersonUpsertInput) => createAdminPerson(input),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPeople });
      queryClient.invalidateQueries({ queryKey: queryKeys.people });
      queryClient.setQueryData(queryKeys.adminPerson(created.id), created);
    },
  });
}

export function useUpdatePersonMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminPersonUpdateInput }) => updateAdminPerson(id, input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPeople });
      queryClient.invalidateQueries({ queryKey: queryKeys.people });
      queryClient.setQueryData(queryKeys.adminPerson(updated.id), updated);
    },
  });
}

export function useArchivePersonMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveAdminPerson(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPeople });
      queryClient.invalidateQueries({ queryKey: queryKeys.people });
      queryClient.removeQueries({ queryKey: queryKeys.adminPerson(id) });
    },
  });
}
