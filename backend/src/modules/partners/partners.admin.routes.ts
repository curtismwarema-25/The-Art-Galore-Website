import { PartnerStatus, UserRole } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.js";
import { authorize } from "../../common/middleware/authorize.js";
import { validateRequest } from "../../common/validation/validateRequest.js";
import { PartnersService } from "./partners.service.js";
import {
  createAdminPartnerSchema,
  listAdminPartnersQuerySchema,
  partnerIdParamsSchema,
  updateAdminPartnerSchema,
} from "./partners.schema.js";

const PARTNERS_READ_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.MODERATOR];
const PARTNERS_WRITE_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF];

const statusMap: Record<"draft" | "published" | "archived", PartnerStatus> = {
  draft: PartnerStatus.DRAFT,
  published: PartnerStatus.ACTIVE,
  archived: PartnerStatus.ARCHIVED,
};

const partnersService = new PartnersService();
export const adminPartnersRouter = Router();

adminPartnersRouter.use(authenticate);

adminPartnersRouter.get("/", authorize(PARTNERS_READ_ROLES), validateRequest(listAdminPartnersQuerySchema), async (req, res, next) => {
  try {
    const query = listAdminPartnersQuerySchema.shape.query.parse(req.query);
    const records = await partnersService.listAdminPartners({
      search: query.search,
      homepageOnly: query.homepageOnly,
      status: query.status ? statusMap[query.status] : undefined,
    });

    res.status(200).json({ data: records });
  } catch (error) {
    next(error);
  }
});

adminPartnersRouter.get("/:id", authorize(PARTNERS_READ_ROLES), validateRequest(partnerIdParamsSchema), async (req, res, next) => {
  try {
    const { id } = partnerIdParamsSchema.shape.params.parse(req.params);
    const record = await partnersService.getAdminPartnerById(id);

    res.status(200).json({ data: record });
  } catch (error) {
    next(error);
  }
});

adminPartnersRouter.post("/", authorize(PARTNERS_WRITE_ROLES), validateRequest(createAdminPartnerSchema), async (req, res, next) => {
  try {
    const input = createAdminPartnerSchema.shape.body.parse(req.body);
    const record = await partnersService.createAdminPartner(input);

    res.status(201).json({ data: record });
  } catch (error) {
    next(error);
  }
});

adminPartnersRouter.patch("/:id", authorize(PARTNERS_WRITE_ROLES), validateRequest(updateAdminPartnerSchema), async (req, res, next) => {
  try {
    const { id } = updateAdminPartnerSchema.shape.params.parse(req.params);
    const input = updateAdminPartnerSchema.shape.body.parse(req.body);
    const record = await partnersService.updateAdminPartner(id, input);

    res.status(200).json({ data: record });
  } catch (error) {
    next(error);
  }
});

adminPartnersRouter.delete("/:id", authorize(PARTNERS_WRITE_ROLES), validateRequest(partnerIdParamsSchema), async (req, res, next) => {
  try {
    const { id } = partnerIdParamsSchema.shape.params.parse(req.params);
    await partnersService.archiveAdminPartner(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
