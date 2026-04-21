import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  approveAdminManualPaymentSubmission,
  rejectAdminManualPaymentSubmission,
  submitManualPaymentProof,
  type SubmitManualPaymentProofInput,
} from "@/api/endpoints/payments";
import { queryKeys } from "@/hooks/queryKeys";

export function useSubmitManualPaymentProofMutation(publicToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitManualPaymentProofInput) => submitManualPaymentProof(publicToken, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trackedOrder(publicToken) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminManualPayments });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders });
    },
  });
}

export function useApproveManualPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, verificationNote }: { id: string; verificationNote?: string }) =>
      approveAdminManualPaymentSubmission(id, verificationNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminManualPayments });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders });
    },
  });
}

export function useRejectManualPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, verificationNote }: { id: string; verificationNote?: string }) =>
      rejectAdminManualPaymentSubmission(id, verificationNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminManualPayments });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders });
    },
  });
}
