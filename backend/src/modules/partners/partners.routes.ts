import { Router } from "express";
import { validateRequest } from "../../common/validation/validateRequest.js";
import { listPartnersQuerySchema } from "./partners.schema.js";
import { PartnersService } from "./partners.service.js";

export const partnersRouter = Router();
const partnersService = new PartnersService();

partnersRouter.get("/", validateRequest(listPartnersQuerySchema), async (req, res, next) => {
  try {
    const query = listPartnersQuerySchema.shape.query.parse(req.query);
    const records = await partnersService.listPublicPartners(query);

    res.status(200).json({ data: records });
  } catch (error) {
    next(error);
  }
});
