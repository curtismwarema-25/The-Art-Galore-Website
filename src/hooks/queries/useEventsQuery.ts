import { useQuery } from "@tanstack/react-query";
import { getEvents } from "@/api/endpoints/events";
import { queryKeys } from "@/hooks/queryKeys";

export function useEventsQuery() {
  return useQuery({
    queryKey: queryKeys.events,
    queryFn: getEvents,
  });
}
