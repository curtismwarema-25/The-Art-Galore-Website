import { useQuery } from "@tanstack/react-query";
import { getApprovedCommunityUploads } from "@/api/endpoints/uploads";
import { queryKeys } from "@/hooks/queryKeys";

export function useApprovedUploadsQuery(eventId?: string) {
  return useQuery({
    queryKey: eventId ? [...queryKeys.approvedUploads, eventId] : queryKeys.approvedUploads,
    queryFn: () => getApprovedCommunityUploads({ eventId }),
  });
}
