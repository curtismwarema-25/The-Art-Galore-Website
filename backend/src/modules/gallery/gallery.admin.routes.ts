import { UserRole } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.js";
import { authorize } from "../../common/middleware/authorize.js";
import { validateRequest } from "../../common/validation/validateRequest.js";
import { GalleryService } from "./gallery.service.js";
import {
  createAdminGalleryImageSchema,
  galleryImageIdParamsSchema,
  listAdminGalleryQuerySchema,
  updateAdminGalleryImageSchema,
} from "./gallery.schema.js";

const GALLERY_READ_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.MODERATOR];
const GALLERY_WRITE_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF];

export const adminGalleryRouter = Router();
const galleryService = new GalleryService();

adminGalleryRouter.use(authenticate);

adminGalleryRouter.get("/", authorize(GALLERY_READ_ROLES), validateRequest(listAdminGalleryQuerySchema), async (req, res, next) => {
  try {
    const query = listAdminGalleryQuerySchema.shape.query.parse(req.query);
    const records = await galleryService.listAdminGalleryImages({
      eventId: query.eventId,
      search: query.search,
      featured: query.featured,
      isActive: query.status ? query.status === "published" : undefined,
    });

    res.status(200).json({ data: records });
  } catch (error) {
    next(error);
  }
});

adminGalleryRouter.get("/:id", authorize(GALLERY_READ_ROLES), validateRequest(galleryImageIdParamsSchema), async (req, res, next) => {
  try {
    const { id } = galleryImageIdParamsSchema.shape.params.parse(req.params);
    const record = await galleryService.getAdminGalleryImageById(id);

    res.status(200).json({ data: record });
  } catch (error) {
    next(error);
  }
});

adminGalleryRouter.post("/", authorize(GALLERY_WRITE_ROLES), validateRequest(createAdminGalleryImageSchema), async (req, res, next) => {
  try {
    const input = createAdminGalleryImageSchema.shape.body.parse(req.body);
    const record = await galleryService.createAdminGalleryImage(input);

    res.status(201).json({ data: record });
  } catch (error) {
    next(error);
  }
});

adminGalleryRouter.patch("/:id", authorize(GALLERY_WRITE_ROLES), validateRequest(updateAdminGalleryImageSchema), async (req, res, next) => {
  try {
    const { id } = updateAdminGalleryImageSchema.shape.params.parse(req.params);
    const input = updateAdminGalleryImageSchema.shape.body.parse(req.body);
    const record = await galleryService.updateAdminGalleryImage(id, input);

    res.status(200).json({ data: record });
  } catch (error) {
    next(error);
  }
});

adminGalleryRouter.delete("/:id", authorize(GALLERY_WRITE_ROLES), validateRequest(galleryImageIdParamsSchema), async (req, res, next) => {
  try {
    const { id } = galleryImageIdParamsSchema.shape.params.parse(req.params);
    await galleryService.archiveAdminGalleryImage(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
