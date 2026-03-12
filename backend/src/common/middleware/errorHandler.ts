import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { logger } from "../utils/logger.js";

function sanitizeDetails(details: unknown) {
  if (!details || typeof details !== "object") {
    return undefined;
  }

  try {
    const serialized = JSON.stringify(details);
    if (serialized.length <= 2000) {
      return JSON.parse(serialized);
    }

    return {
      truncated: true,
      preview: serialized.slice(0, 2000),
    };
  } catch {
    return {
      truncated: true,
    };
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    logger.warn("Handled application error", {
      code: err.code,
      statusCode: err.statusCode,
      message: err.message,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      details: sanitizeDetails(err.details),
    });

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? null,
      },
    });
    return;
  }

  const safeError = err instanceof Error ? err : new Error("Unknown error");
  logger.error("Unhandled server error", {
    name: safeError.name,
    message: safeError.message,
    method: req.method,
    path: req.originalUrl,
    ipAddress: req.ip,
  });

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error",
      details: null,
    },
  });
}
