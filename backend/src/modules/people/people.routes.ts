import { Router } from "express";
import { validateRequest } from "../../common/validation/validateRequest.js";
import { personSlugParamsSchema, listPeopleQuerySchema } from "./people.schema.js";
import { PeopleService } from "./people.service.js";

export const peopleRouter = Router();
const peopleService = new PeopleService();

peopleRouter.get("/", validateRequest(listPeopleQuerySchema), async (req, res, next) => {
  try {
    const query = listPeopleQuerySchema.shape.query.parse(req.query);
    const records = await peopleService.listPublicPeople(query);

    res.status(200).json({ data: records });
  } catch (error) {
    next(error);
  }
});

peopleRouter.get("/:slug", validateRequest(personSlugParamsSchema), async (req, res, next) => {
  try {
    const { slug } = personSlugParamsSchema.shape.params.parse(req.params);
    const record = await peopleService.getPublicPersonBySlug(slug);

    res.status(200).json({ data: record });
  } catch (error) {
    next(error);
  }
});
