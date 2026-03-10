import { useMutation } from "@tanstack/react-query";
import { uploadMediaFile, type MediaTarget } from "@/api/endpoints/media";

export function useUploadMediaMutation() {
  return useMutation({
    mutationFn: ({ file, target }: { file: File; target: MediaTarget }) =>
      uploadMediaFile(file, target),
  });
}
