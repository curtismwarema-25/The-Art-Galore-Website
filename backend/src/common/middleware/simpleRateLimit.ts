import type { NextFunction, Request, Response } from "express";
import { RateLimitError } from "../errors/httpErrors.js";

type RateLimitState = {
  count: number;
  windowStartedAt: number;
};

type SimpleRateLimitOptions = {
  windowMs: number;
  maxAttempts: number;
  keyPrefix: string;
};

const MAX_CACHE_ENTRIES = 20_000;

function normalizeIp(ip: string | undefined) {
  return (ip ?? "unknown").trim().toLowerCase();
}

export function createSimpleRateLimit(options: SimpleRateLimitOptions) {
  const attempts = new Map<string, RateLimitState>();

  function cleanup(now: number) {
    if (attempts.size <= MAX_CACHE_ENTRIES) return;

    for (const [key, state] of attempts.entries()) {
      if (now - state.windowStartedAt > options.windowMs * 2) {
        attempts.delete(key);
      }
    }
  }

  return (req: Request, _res: Response, next: NextFunction) => {
    const now = Date.now();
    cleanup(now);

    const key = `${options.keyPrefix}:${normalizeIp(req.ip)}`;
    const existing = attempts.get(key);

    if (!existing || now - existing.windowStartedAt > options.windowMs) {
      attempts.set(key, { count: 1, windowStartedAt: now });
      next();
      return;
    }

    const nextCount = existing.count + 1;
    attempts.set(key, { ...existing, count: nextCount });

    if (nextCount > options.maxAttempts) {
      next(new RateLimitError("Too many requests. Please try again shortly."));
      return;
    }

    next();
  };
}
