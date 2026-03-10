import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { mkdirSync } from "node:fs";
import { errorHandler } from "./common/middleware/errorHandler.js";
import { env } from "./config/index.js";
import { prisma } from "./lib/prisma.js";
import { resolveMediaRootPath } from "./modules/media/storage/localStorage.js";
import { registerRoutes } from "./routes.js";

export function createApp() {
  const app = express();

  const allowedOrigins = env.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin not allowed by CORS"));
      },
      credentials: true,
    }),
  );

  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  const mediaRoot = resolveMediaRootPath();
  mkdirSync(mediaRoot, { recursive: true });
  app.use(`${env.API_PREFIX}${env.MEDIA_PUBLIC_BASE_PATH}`, express.static(mediaRoot));
  // Backward-compatible alias for already persisted legacy `/uploads/...` URLs.
  app.use("/uploads", express.static(mediaRoot));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/health/db", async (_req, res, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: "ok", database: "connected" });
    } catch (error) {
      next(error);
    }
  });

  registerRoutes(app, env.API_PREFIX);
  app.use(errorHandler);

  return app;
}
