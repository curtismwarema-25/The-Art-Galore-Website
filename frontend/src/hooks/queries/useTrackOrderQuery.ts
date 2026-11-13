import { useQuery } from "@tanstack/react-query";
import { trackOrder } from "@/api/endpoints/orders";
import { queryKeys } from "@/hooks/queryKeys";

export const TRACK_ORDER_TIMEOUT_MS = 10_000;

export function createTrackOrderTimeoutSignal(parentSignal: AbortSignal, timeoutMs = TRACK_ORDER_TIMEOUT_MS) {
  const timeoutController = new AbortController();
  const timeoutId = window.setTimeout(() => timeoutController.abort(), timeoutMs);
  const abortFromQuery = () => timeoutController.abort();

  if (parentSignal.aborted) {
    timeoutController.abort();
  } else {
    parentSignal.addEventListener("abort", abortFromQuery, { once: true });
  }

  return {
    signal: timeoutController.signal,
    cleanup: () => {
      window.clearTimeout(timeoutId);
      parentSignal.removeEventListener("abort", abortFromQuery);
    },
  };
}

export function useTrackOrderQuery(publicToken: string, refetchInterval = 30_000) {
  return useQuery({
    queryKey: queryKeys.trackedOrder(publicToken),
    queryFn: ({ signal }) => {
      const request = createTrackOrderTimeoutSignal(signal);
      return trackOrder(publicToken, request.signal).finally(request.cleanup);
    },
    enabled: Boolean(publicToken),
    refetchInterval,
    refetchOnWindowFocus: true,
  });
}
