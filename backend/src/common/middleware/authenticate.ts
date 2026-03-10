import type { NextFunction, Request, Response } from "express";
import { getSessionCookieName } from "../auth/session.js";
import { UnauthorizedError } from "../errors/httpErrors.js";
import { AuthService } from "../../modules/auth/auth.service.js";

const authService = new AuthService();

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const sessionToken = req.cookies?.[getSessionCookieName()];

    if (!sessionToken || typeof sessionToken !== "string") {
      throw new UnauthorizedError("Authentication required");
    }

    const context = await authService.getSessionContext(sessionToken);

    if (!context) {
      throw new UnauthorizedError("Invalid or expired session");
    }

    req.auth = context;
    next();
  } catch (error) {
    next(error);
  }
}
