import { useQuery } from "@tanstack/react-query";
import { getPeople } from "@/api/endpoints/people";
import { queryKeys } from "@/hooks/queryKeys";

export function usePeopleQuery() {
  return useQuery({
    queryKey: queryKeys.people,
    queryFn: getPeople,
  });
}
