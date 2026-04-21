import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  archiveAdminGalleryImage,
  createAdminGalleryImage,
  updateAdminGalleryImage,
  type AdminGalleryImageUpdateInput,
  type AdminGalleryImageUpsertInput,
} from "@/api/endpoints/adminGallery";
import { queryKeys } from "@/hooks/queryKeys";

export function useCreateGalleryImageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminGalleryImageUpsertInput) => createAdminGalleryImage(input),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminGallery });
      queryClient.invalidateQueries({ queryKey: queryKeys.gallery });
      queryClient.setQueryData(queryKeys.adminGalleryImage(created.id), created);
    },
  });
}

export function useUpdateGalleryImageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminGalleryImageUpdateInput }) =>
      updateAdminGalleryImage(id, input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminGallery });
      queryClient.invalidateQueries({ queryKey: queryKeys.gallery });
      queryClient.setQueryData(queryKeys.adminGalleryImage(updated.id), updated);
    },
  });
}

export function useArchiveGalleryImageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveAdminGalleryImage(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminGallery });
      queryClient.invalidateQueries({ queryKey: queryKeys.gallery });
      queryClient.removeQueries({ queryKey: queryKeys.adminGalleryImage(id) });
    },
  });
}
