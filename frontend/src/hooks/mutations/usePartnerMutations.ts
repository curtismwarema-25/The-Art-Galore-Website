import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  archiveAdminPartner,
  createAdminPartner,
  updateAdminPartner,
  type AdminPartnerUpdateInput,
  type AdminPartnerUpsertInput,
} from "@/api/endpoints/adminPartners";
import { queryKeys } from "@/hooks/queryKeys";

export function useCreatePartnerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPartnerUpsertInput) => createAdminPartner(input),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPartners });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners });
      queryClient.setQueryData(queryKeys.adminPartner(created.id), created);
    },
  });
}

export function useUpdatePartnerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminPartnerUpdateInput }) => updateAdminPartner(id, input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPartners });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners });
      queryClient.setQueryData(queryKeys.adminPartner(updated.id), updated);
    },
  });
}

export function useArchivePartnerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveAdminPartner(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPartners });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners });
      queryClient.removeQueries({ queryKey: queryKeys.adminPartner(id) });
    },
  });
}
