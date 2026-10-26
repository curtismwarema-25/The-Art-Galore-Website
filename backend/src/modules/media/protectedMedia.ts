import express, { type RequestHandler } from "express";
import { getSessionCookieName } from "../../common/auth/session.js";
import { ForbiddenError, UnauthorizedError } from "../../common/errors/httpErrors.js";
import { ADMIN_ACCESS_ROLES } from "../../common/middleware/authorize.js";
import { AuthService } from "../auth/auth.service.js";
import type { AuthSessionContext } from "../auth/auth.types.js";

type SessionResolver = (sessionToken: string) => Promise<AuthSessionContext | null>;

function isPaymentProofPath(pathname: string) {
  return pathname.split("/").filter(Boolean)[0] === "payment-proof";
}

export function createProtectedMediaMiddleware(
  mediaRoot: string,
  dependencies: {
    resolveSession?: SessionResolver;
    serveStatic?: RequestHandler;
  } = {},
): RequestHandler {
  const authService = new AuthService();
  const resolveSession = dependencies.resolveSession ?? ((sessionToken: string) => authService.getSessionContext(sessionToken));
  const serveStatic = dependencies.serveStatic ?? express.static(mediaRoot);

  return async (req, res, next) => {
    if (!isPaymentProofPath(req.path)) {
      serveStatic(req, res, next);
      return;
    }

    const sessionToken = req.cookies?.[getSessionCookieName()];
    if (!sessionToken || typeof sessionToken !== "string") {
      next(new UnauthorizedError("Authentication required"));
      return;
    }

    try {
      const context = await resolveSession(sessionToken);
      if (!context) {
        throw new UnauthorizedError("Invalid or expired session");
      }

      if (!ADMIN_ACCESS_ROLES.includes(context.user.role)) {
        throw new ForbiddenError("Insufficient permissions");
      }

      serveStatic(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}
