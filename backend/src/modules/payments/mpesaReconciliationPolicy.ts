const RECONCILIATION_BACKOFF_MS = [
  60_000,
  2 * 60_000,
  4 * 60_000,
  8 * 60_000,
  16 * 60_000,
  32 * 60_000,
  60 * 60_000,
];

export type MpesaReconciliationSchedule = {
  attemptNumber: number;
  manualReview: boolean;
  nextAttemptAt?: Date;
};

export function getMpesaReconciliationSchedule(input: {
  attemptCount: number;
  maxAttempts: number;
  now?: Date;
  retryAfterMs?: number;
}): MpesaReconciliationSchedule {
  const attemptNumber = Math.max(0, input.attemptCount) + 1;
  const manualReview = attemptNumber >= input.maxAttempts;

  if (manualReview) {
    return { attemptNumber, manualReview };
  }

  const delayMs = input.retryAfterMs ?? RECONCILIATION_BACKOFF_MS[Math.min(attemptNumber - 1, RECONCILIATION_BACKOFF_MS.length - 1)];
  return {
    attemptNumber,
    manualReview,
    nextAttemptAt: new Date((input.now ?? new Date()).getTime() + delayMs),
  };
}
