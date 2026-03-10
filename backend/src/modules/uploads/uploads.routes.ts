import { UserRole } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.js";
import { authorize } from "../../common/middleware/authorize.js";
import { validateRequest } from "../../common/validation/validateRequest.js";
import { UploadsService } from "./uploads.service.js";
import {
  createCommunityUploadSchema,
  listAdminUploadsQuerySchema,
  listCommunityUploadsQuerySchema,
  moderateCommunityUploadSchema,
  uploadIdParamsSchema,
} from "./uploads.schema.js";

const UPLOADS_READ_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.MODERATOR];
const UPLOADS_MODERATION_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.MODERATOR];
const UPLOADS_DELETE_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF];

const statusMap = {
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
} as const;

const uploadsService = new UploadsService();

export const uploadsRouter = Router();
export const adminUploadsRouter = Router();

uploadsRouter.get("/", validateRequest(listCommunityUploadsQuerySchema), async (req, res, next) => {
  try {
    const query = listCommunityUploadsQuerySchema.shape.query.parse(req.query);
    const uploads = await uploadsService.listPublicApprovedUploads({
      eventId: query.eventId,
    });

    res.status(200).json({ data: uploads });
  } catch (error) {
    next(error);
  }
});

uploadsRouter.post("/", validateRequest(createCommunityUploadSchema), async (req, res, next) => {
  try {
    const input = createCommunityUploadSchema.shape.body.parse(req.body);
    const upload = await uploadsService.submitCommunityUpload(input);

    res.status(201).json({ data: upload });
  } catch (error) {
    next(error);
  }
});

adminUploadsRouter.use(authenticate);

adminUploadsRouter.get(
  "/",
  authorize(UPLOADS_READ_ROLES),
  validateRequest(listAdminUploadsQuerySchema),
  async (req, res, next) => {
    try {
      const query = listAdminUploadsQuerySchema.shape.query.parse(req.query);
      const uploads = await uploadsService.listAdminUploads({
        eventId: query.eventId,
        search: query.search,
        status: query.status ? statusMap[query.status] : undefined,
      });

      res.status(200).json({ data: uploads });
    } catch (error) {
      next(error);
    }
  },
);

adminUploadsRouter.get("/:id", authorize(UPLOADS_READ_ROLES), validateRequest(uploadIdParamsSchema), async (req, res, next) => {
  try {
    const { id } = uploadIdParamsSchema.shape.params.parse(req.params);
    const upload = await uploadsService.getAdminUploadById(id);

    res.status(200).json({ data: upload });
  } catch (error) {
    next(error);
  }
});

adminUploadsRouter.patch(
  "/:id/status",
  authorize(UPLOADS_MODERATION_ROLES),
  validateRequest(moderateCommunityUploadSchema),
  async (req, res, next) => {
    try {
      const { id } = moderateCommunityUploadSchema.shape.params.parse(req.params);
      const input = moderateCommunityUploadSchema.shape.body.parse(req.body);
      const upload = await uploadsService.moderateUpload(id, req.auth!.user.id, input);

      res.status(200).json({ data: upload });
    } catch (error) {
      next(error);
    }
  },
);

adminUploadsRouter.delete("/:id", authorize(UPLOADS_DELETE_ROLES), validateRequest(uploadIdParamsSchema), async (req, res, next) => {
  try {
    const { id } = uploadIdParamsSchema.shape.params.parse(req.params);
    await uploadsService.deleteUpload(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
