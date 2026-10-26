import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { errorHandler } from "./common/middleware/errorHandler.js";
import { env } from "./config/index.js";
import { prisma } from "./lib/prisma.js";
import { resolveMediaRootPath } from "./modules/media/storage/localStorage.js";
import { registerRoutes } from "./routes.js";
import { UploadsRepository } from "./modules/uploads/uploads.repository.js";
import { mediaStorage } from "./modules/media/storage/provider.js";
import { imageMediaResponse } from "./modules/media/mediaResponse.js";
import { isCommunityMediaApproved, isPublicMediaTarget } from "./modules/media/mediaAccess.js";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function normalizeOrigin(origin: string) {
  try {
    const url = new URL(origin);
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    const host = LOOPBACK_HOSTS.has(url.hostname) ? "loopback" : url.hostname;
    return `${url.protocol}//${host}:${port}`;
  } catch {
    return origin.trim();
  }
}

function isLoopbackOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return LOOPBACK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function createApp() {
  const app = express();
  app.set("trust proxy", env.TRUST_PROXY_HOPS);

  const allowedOrigins = env.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const normalizedAllowedOrigins = new Set(allowedOrigins.map((origin) => normalizeOrigin(origin)));

  app.use(
    cors({
      origin(origin, callback) {
        const originValue = origin ?? "";
        const allowAllOriginsInDev = env.NODE_ENV !== "production" && env.CORS_ALLOW_ALL_IN_DEV;
        const allowInDev = Boolean(origin) && env.NODE_ENV !== "production" && isLoopbackOrigin(originValue);

        if (
          !origin ||
          allowAllOriginsInDev ||
          allowInDev ||
          allowedOrigins.length === 0 ||
          normalizedAllowedOrigins.has(normalizeOrigin(origin))
        ) {
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
  const uploadsRepository = new UploadsRepository();
  const serveMedia = (prefix: string) => app.use(prefix, async (req, res, next) => {
    try {
      const storageKey = decodeURIComponent(req.path.replace(/^\/+/, ""));
      const target = storageKey.split("/")[0];
      if (!storageKey || (!isPublicMediaTarget(target) && target !== "community")) {
        res.status(404).json({ error: "Media not found" });
        return;
      }
      if (target === "community") {
        const approved = await uploadsRepository.findApprovedUploadByStorageKey(storageKey);
        if (!isCommunityMediaApproved(approved ? "APPROVED" : undefined)) {
          res.status(404).json({ error: "Media not found" });
          return;
        }
      }
      await imageMediaResponse(res, await mediaStorage.getExistingFilePath(storageKey));
    } catch (error) {
      if (error instanceof URIError) { res.status(404).json({ error: "Media not found" }); return; }
      if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
        res.status(404).json({ error: "Media not found" }); return;
      }
      if (error instanceof Error && error.message === "Invalid storage key") {
        res.status(404).json({ error: "Media not found" }); return;
      }
      next(error);
    }
  });
  serveMedia(`${env.API_PREFIX}${env.MEDIA_PUBLIC_BASE_PATH}`);
  // Backward-compatible alias, filtered by the same public access policy.
  serveMedia("/uploads");

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

  if (env.SERVE_FRONTEND) {
    const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../");
    const frontendDist = resolve(projectRoot, "frontend/dist");
    const frontendIndex = resolve(frontendDist, "index.html");

    if (!existsSync(frontendIndex)) {
      throw new Error(`SERVE_FRONTEND is enabled, but the production frontend build is missing at ${frontendDist}`);
    }

    app.use(express.static(frontendDist, { index: false, fallthrough: true }));
    app.get("*", (req, res, next) => {
      const isApiRequest = req.path === env.API_PREFIX || req.path.startsWith(`${env.API_PREFIX}/`);
      const isHealthRequest = req.path === "/health" || req.path.startsWith("/health/");
      if (isApiRequest || isHealthRequest || !req.accepts("html")) {
        next();
        return;
      }

      res.sendFile(frontendIndex);
    });
  }

  app.use(errorHandler);

  return app;
}
