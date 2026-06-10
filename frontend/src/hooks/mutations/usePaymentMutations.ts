import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  approveAdminManualPaymentSubmission,
  initiateMpesaStkPush,
  rejectAdminManualPaymentSubmission,
  reverifyAdminMpesaTransaction,
  submitManualPaymentProof,
  type InitiateStkPushInput,
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

export function useInitiateMpesaStkPushMutation(publicToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: InitiateStkPushInput; idempotencyKey?: string }) =>
      initiateMpesaStkPush(publicToken, input, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trackedOrder(publicToken) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminMpesaTransactions });
    },
  });
}

export function useReverifyMpesaTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reverifyAdminMpesaTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminMpesaTransactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders });
    },
  });
}
