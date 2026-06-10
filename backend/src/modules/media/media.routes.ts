import { UserRole } from "@prisma/client";
import multer from "multer";
import type { Request } from "express";
import { Router } from "express";
import { ForbiddenError, UnauthorizedError, ValidationError } from "../../common/errors/httpErrors.js";
import { validateRequest } from "../../common/validation/validateRequest.js";
import { getSessionCookieName } from "../../common/auth/session.js";
import { AuthService } from "../auth/auth.service.js";
import { createSimpleRateLimit } from "../../common/middleware/simpleRateLimit.js";
import { mediaValidationByTarget } from "./media.config.js";
import { deleteMediaQuerySchema, mediaTargetSchema } from "./media.schema.js";
import { MediaService } from "./media.service.js";

const uploadParser = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
  },
});

const mediaService = new MediaService();
const authService = new AuthService();
const publicUploadRateLimit = createSimpleRateLimit({
  keyPrefix: "public-upload",
  windowMs: 15 * 60 * 1000,
  maxAttempts: 20,
});

const WRITE_MEDIA_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF];

async function resolveAuthContext(req: Request) {
  const sessionToken = req.cookies?.[getSessionCookieName()];
  if (!sessionToken || typeof sessionToken !== "string") return null;

  try {
    return await authService.getSessionContext(sessionToken);
  } catch {
    return null;
  }
}

function assertWriteMediaRole(role: UserRole | undefined) {
  if (!role) {
    throw new UnauthorizedError("Authentication required");
  }

  if (!WRITE_MEDIA_ROLES.includes(role)) {
    throw new ForbiddenError("Insufficient permissions");
  }
}

export const mediaRouter = Router();

mediaRouter.get("/targets", (_req, res) => {
  res.status(200).json({ data: mediaValidationByTarget });
});

mediaRouter.post("/upload", publicUploadRateLimit, (req, res, next) => {
  uploadParser.single("file")(req, res, async (error) => {
    try {
      if (error) {
        if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
          throw new ValidationError("File exceeds upload limit");
        }

        throw error;
      }

      const target = mediaTargetSchema.parse(req.body?.target);
      const context = await resolveAuthContext(req);

      const isPublicTarget = target === "community" || target === "payment-proof";

      if (!isPublicTarget) {
        if (!context) {
          throw new UnauthorizedError("Authentication required");
        }

        assertWriteMediaRole(context.user.role);
      }

      const file = req.file;
      if (!file) {
        throw new ValidationError("File is required");
      }

      const mediaAsset = await mediaService.upload({
        target,
        buffer: file.buffer,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        originalName: file.originalname,
      });

      res.status(201).json({ data: mediaAsset });
    } catch (routeError) {
      next(routeError);
    }
  });
});

mediaRouter.delete("/", validateRequest(deleteMediaQuerySchema), async (req, res, next) => {
  try {
    const context = await resolveAuthContext(req);
    assertWriteMediaRole(context?.user.role);

    const { storageKey } = deleteMediaQuerySchema.shape.query.parse(req.query);
    await mediaService.delete(storageKey);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
