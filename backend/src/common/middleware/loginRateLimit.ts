import { RateLimitError } from "../errors/httpErrors.js";

type AttemptState = {
  count: number;
  windowStartedAt: number;
  blockedUntil: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 10_000;

function normalizeIp(ip: string | undefined) {
  return (ip ?? "unknown").trim().toLowerCase();
}

function normalizeEmail(email: string | undefined) {
  return (email ?? "unknown").trim().toLowerCase();
}

export class LoginRateLimiter {
  private readonly attempts = new Map<string, AttemptState>();

  private cleanup(now: number) {
    if (this.attempts.size <= MAX_CACHE_ENTRIES) {
      return;
    }

    for (const [key, state] of this.attempts.entries()) {
      const staleFor = now - Math.max(state.windowStartedAt, state.blockedUntil);
      if (staleFor > BLOCK_MS * 2) {
        this.attempts.delete(key);
      }
    }
  }

  buildKey(ipAddress?: string, email?: string) {
    return `${normalizeIp(ipAddress)}|${normalizeEmail(email)}`;
  }

  assertAllowed(key: string) {
    const now = Date.now();
    this.cleanup(now);

    const state = this.attempts.get(key);
    if (!state) {
      return;
    }

    if (state.blockedUntil > now) {
      const retryInMinutes = Math.max(1, Math.ceil((state.blockedUntil - now) / 60_000));
      throw new RateLimitError(`Too many login attempts. Try again in ${retryInMinutes} minute(s).`);
    }

    if (now - state.windowStartedAt > WINDOW_MS) {
      this.attempts.delete(key);
    }
  }

  recordFailure(key: string) {
    const now = Date.now();
    this.cleanup(now);

    const existing = this.attempts.get(key);
    if (!existing || now - existing.windowStartedAt > WINDOW_MS) {
      this.attempts.set(key, {
        count: 1,
        windowStartedAt: now,
        blockedUntil: 0,
      });
      return;
    }

    const nextCount = existing.count + 1;
    const blockedUntil = nextCount >= MAX_ATTEMPTS ? now + BLOCK_MS : existing.blockedUntil;

    this.attempts.set(key, {
      count: nextCount,
      windowStartedAt: existing.windowStartedAt,
      blockedUntil,
    });
  }

  recordSuccess(key: string) {
    this.attempts.delete(key);
  }
}

export const loginRateLimiter = new LoginRateLimiter();
