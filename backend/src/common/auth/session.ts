import { createHash, randomBytes } from "node:crypto";
import type { CookieOptions, Response } from "express";
import { env } from "../../config/index.js";

export const SESSION_TTL_MS = env.SESSION_TTL_HOURS * 60 * 60 * 1000;

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(sessionToken: string) {
  return createHash("sha256").update(sessionToken).digest("hex");
}

export function getSessionCookieName() {
  return env.SESSION_COOKIE_NAME;
}

export function getSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    sameSite: env.SESSION_SAME_SITE,
    domain: env.SESSION_COOKIE_DOMAIN,
    maxAge: SESSION_TTL_MS,
    path: "/",
  };
}

export function setSessionCookie(res: Response, sessionToken: string) {
  res.cookie(getSessionCookieName(), sessionToken, getSessionCookieOptions());
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(getSessionCookieName(), {
    ...getSessionCookieOptions(),
    maxAge: undefined,
  });
}
