import { UserRole } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.js";
import { authorize } from "../../common/middleware/authorize.js";
import { validateRequest } from "../../common/validation/validateRequest.js";
import { SettingsService } from "./settings.service.js";
import { adminSettingsRouteSchema, updateAdminSettingsSchema } from "./settings.schema.js";

const SETTINGS_READ_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.MODERATOR];
const SETTINGS_WRITE_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF];

export const settingsRouter = Router();
export const adminSettingsRouter = Router();
const settingsService = new SettingsService();

settingsRouter.get("/public", async (_req, res, next) => {
  try {
    const settings = await settingsService.getPublicSettings();
    res.status(200).json({ data: settings });
  } catch (error) {
    next(error);
  }
});

adminSettingsRouter.use(authenticate);

adminSettingsRouter.get("/", authorize(SETTINGS_READ_ROLES), validateRequest(adminSettingsRouteSchema), async (_req, res, next) => {
  try {
    const settings = await settingsService.getAdminSettings();
    res.status(200).json({ data: settings });
  } catch (error) {
    next(error);
  }
});

adminSettingsRouter.patch("/", authorize(SETTINGS_WRITE_ROLES), validateRequest(updateAdminSettingsSchema), async (req, res, next) => {
  try {
    const input = updateAdminSettingsSchema.shape.body.parse(req.body);
    const settings = await settingsService.updateAdminSettings(input);
    res.status(200).json({ data: settings });
  } catch (error) {
    next(error);
  }
});
