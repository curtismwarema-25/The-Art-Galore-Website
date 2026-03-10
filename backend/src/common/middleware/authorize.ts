import { UserRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors/httpErrors.js";

export const ADMIN_ACCESS_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.MODERATOR];
export const ADMIN_ONLY_ROLES: UserRole[] = [UserRole.ADMIN];
export const MODERATOR_CAPABLE_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MODERATOR];

export function authorize(roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      next(new UnauthorizedError("Authentication required"));
      return;
    }

    if (!roles.includes(req.auth.user.role)) {
      next(new ForbiddenError("Insufficient permissions"));
      return;
    }

    next();
  };
}
