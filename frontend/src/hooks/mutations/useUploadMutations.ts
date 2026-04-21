import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteCommunityUpload,
  moderateCommunityUpload,
  submitCommunityUpload,
  type ModerateCommunityUploadInput,
  type SubmitCommunityUploadInput,
} from "@/api/endpoints/uploads";
import { queryKeys } from "@/hooks/queryKeys";

export function useSubmitCommunityUploadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitCommunityUploadInput) => submitCommunityUpload(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvedUploads });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUploads });
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
    },
  });
}

export function useModerateUploadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uploadId, input }: { uploadId: string; input: ModerateCommunityUploadInput }) =>
      moderateCommunityUpload(uploadId, input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUploads });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvedUploads });
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      queryClient.setQueryData(queryKeys.adminUpload(updated.id), updated);
    },
  });
}

export function useDeleteUploadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uploadId: string) => deleteCommunityUpload(uploadId),
    onSuccess: (_data, uploadId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUploads });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvedUploads });
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      queryClient.removeQueries({ queryKey: queryKeys.adminUpload(uploadId) });
    },
  });
}

// Backward-compatible aliases for older imports.
export const useModerateCommunityUploadMutation = useModerateUploadMutation;
export const useDeleteCommunityUploadMutation = useDeleteUploadMutation;
