import { Router } from "express";
import { validateRequest } from "../../common/validation/validateRequest.js";
import { listGalleryQuerySchema } from "./gallery.schema.js";
import { GalleryService } from "./gallery.service.js";

export const galleryRouter = Router();
const galleryService = new GalleryService();

galleryRouter.get("/", validateRequest(listGalleryQuerySchema), async (req, res, next) => {
  try {
    const query = listGalleryQuerySchema.shape.query.parse(req.query);
    const records = await galleryService.listPublicGalleryImages(query);

    res.status(200).json({ data: records });
  } catch (error) {
    next(error);
  }
});
