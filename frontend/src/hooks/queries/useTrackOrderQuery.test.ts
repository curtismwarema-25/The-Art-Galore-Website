import { describe, expect, it, vi } from "vitest";
import { createTrackOrderTimeoutSignal, TRACK_ORDER_TIMEOUT_MS } from "./useTrackOrderQuery";

describe("tracked order request timeout", () => {
  it("aborts a request after the configured timeout and cleans up its timer", () => {
    vi.useFakeTimers();
    const parentController = new AbortController();
    const request = createTrackOrderTimeoutSignal(parentController.signal);

    expect(request.signal.aborted).toBe(false);
    vi.advanceTimersByTime(TRACK_ORDER_TIMEOUT_MS);
    expect(request.signal.aborted).toBe(true);

    request.cleanup();
    vi.useRealTimers();
  });

  it("propagates React Query cancellation to the request", () => {
    const parentController = new AbortController();
    const request = createTrackOrderTimeoutSignal(parentController.signal);

    parentController.abort();

    expect(request.signal.aborted).toBe(true);
    request.cleanup();
  });
});
