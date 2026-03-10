import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { ValidationError } from "../errors/httpErrors.js";

export function validateRequest(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!parsed.success) {
      next(new ValidationError("Invalid request payload", parsed.error.flatten()));
      return;
    }

    next();
  };
}
