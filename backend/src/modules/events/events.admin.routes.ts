import { EventStatus } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.js";
import { ADMIN_ACCESS_ROLES, authorize } from "../../common/middleware/authorize.js";
import { validateRequest } from "../../common/validation/validateRequest.js";
import { EventsService } from "./events.service.js";
import {
  adminCreateEventSchema,
  adminCreateTicketTierSchema,
  adminEventIdParamsSchema,
  adminEventTicketTierParamsSchema,
  adminTicketTierIdParamsSchema,
  adminUpdateEventSchema,
  adminUpdateTicketTierSchema,
  listAdminEventsQuerySchema,
} from "./events.schema.js";

const statusMap: Record<"draft" | "published" | "cancelled" | "archived", EventStatus> = {
  draft: EventStatus.DRAFT,
  published: EventStatus.PUBLISHED,
  cancelled: EventStatus.CANCELLED,
  archived: EventStatus.ARCHIVED,
};

const eventsService = new EventsService();

export const adminEventsRouter = Router();
export const adminTicketTiersRouter = Router();

adminEventsRouter.use(authenticate, authorize(ADMIN_ACCESS_ROLES));
adminTicketTiersRouter.use(authenticate, authorize(ADMIN_ACCESS_ROLES));

adminEventsRouter.get("/", validateRequest(listAdminEventsQuerySchema), async (req, res, next) => {
  try {
    const query = listAdminEventsQuerySchema.shape.query.parse(req.query);
    const records = await eventsService.listAdminEvents({
      search: query.search,
      status: query.status ? statusMap[query.status] : undefined,
    });

    res.status(200).json({ data: records });
  } catch (error) {
    next(error);
  }
});

adminEventsRouter.get("/:id", validateRequest(adminEventIdParamsSchema), async (req, res, next) => {
  try {
    const { id } = adminEventIdParamsSchema.shape.params.parse(req.params);
    const record = await eventsService.getAdminEventById(id);

    res.status(200).json({ data: record });
  } catch (error) {
    next(error);
  }
});

adminEventsRouter.post("/", validateRequest(adminCreateEventSchema), async (req, res, next) => {
  try {
    const input = adminCreateEventSchema.shape.body.parse(req.body);
    const record = await eventsService.createAdminEvent(input);

    res.status(201).json({ data: record });
  } catch (error) {
    next(error);
  }
});

adminEventsRouter.patch("/:id", validateRequest(adminUpdateEventSchema), async (req, res, next) => {
  try {
    const { id } = adminUpdateEventSchema.shape.params.parse(req.params);
    const input = adminUpdateEventSchema.shape.body.parse(req.body);
    const record = await eventsService.updateAdminEvent(id, input);

    res.status(200).json({ data: record });
  } catch (error) {
    next(error);
  }
});

adminEventsRouter.delete("/:id", validateRequest(adminEventIdParamsSchema), async (req, res, next) => {
  try {
    const { id } = adminEventIdParamsSchema.shape.params.parse(req.params);
    await eventsService.archiveAdminEvent(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

adminEventsRouter.get(
  "/:eventId/ticket-tiers",
  validateRequest(adminEventTicketTierParamsSchema),
  async (req, res, next) => {
    try {
      const { eventId } = adminEventTicketTierParamsSchema.shape.params.parse(req.params);
      const tiers = await eventsService.listAdminTicketTiers(eventId);

      res.status(200).json({ data: tiers });
    } catch (error) {
      next(error);
    }
  },
);

adminEventsRouter.post(
  "/:eventId/ticket-tiers",
  validateRequest(adminCreateTicketTierSchema),
  async (req, res, next) => {
    try {
      const { eventId } = adminCreateTicketTierSchema.shape.params.parse(req.params);
      const input = adminCreateTicketTierSchema.shape.body.parse(req.body);
      const tier = await eventsService.createAdminTicketTier(eventId, input);

      res.status(201).json({ data: tier });
    } catch (error) {
      next(error);
    }
  },
);

adminTicketTiersRouter.patch("/:id", validateRequest(adminUpdateTicketTierSchema), async (req, res, next) => {
  try {
    const { id } = adminUpdateTicketTierSchema.shape.params.parse(req.params);
    const input = adminUpdateTicketTierSchema.shape.body.parse(req.body);
    const tier = await eventsService.updateAdminTicketTier(id, input);

    res.status(200).json({ data: tier });
  } catch (error) {
    next(error);
  }
});

adminTicketTiersRouter.delete("/:id", validateRequest(adminTicketTierIdParamsSchema), async (req, res, next) => {
  try {
    const { id } = adminTicketTierIdParamsSchema.shape.params.parse(req.params);
    await eventsService.archiveAdminTicketTier(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
