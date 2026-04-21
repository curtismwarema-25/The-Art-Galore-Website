import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAdminTicketTier,
  deleteAdminTicketTier,
  updateAdminTicketTier,
  type AdminTicketTierUpdateInput,
  type AdminTicketTierUpsertInput,
} from "@/api/endpoints/adminEvents";
import { queryKeys } from "@/hooks/queryKeys";

export function useCreateTicketTierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, input }: { eventId: string; input: AdminTicketTierUpsertInput }) =>
      createAdminTicketTier(eventId, input),
    onSuccess: (tier) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTicketTiers(tier.eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEvent(tier.eventId) });
    },
  });
}

export function useUpdateTicketTierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminTicketTierUpdateInput }) => updateAdminTicketTier(id, input),
    onSuccess: (tier) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTicketTiers(tier.eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEvent(tier.eventId) });
    },
  });
}

export function useDeleteTicketTierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, eventId }: { id: string; eventId: string }) => deleteAdminTicketTier(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTicketTiers(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEvent(variables.eventId) });
    },
  });
}
