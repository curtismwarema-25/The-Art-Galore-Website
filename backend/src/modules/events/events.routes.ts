import { Router } from "express";
import { validateRequest } from "../../common/validation/validateRequest.js";
import { EventsService } from "./events.service.js";
import { eventSlugParamsSchema, listEventsQuerySchema } from "./events.schema.js";

export const eventsRouter = Router();
const eventsService = new EventsService();

eventsRouter.get("/", validateRequest(listEventsQuerySchema), async (req, res, next) => {
  try {
    const query = listEventsQuerySchema.shape.query.parse(req.query);
    const records = await eventsService.listPublicEvents(query);

    res.status(200).json({ data: records });
  } catch (error) {
    next(error);
  }
});

eventsRouter.get("/:slug", validateRequest(eventSlugParamsSchema), async (req, res, next) => {
  try {
    const { slug } = eventSlugParamsSchema.shape.params.parse(req.params);
    const record = await eventsService.getPublicEventBySlug(slug);

    res.status(200).json({ data: record });
  } catch (error) {
    next(error);
  }
});
