import { UserRole, PersonStatus } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.js";
import { authorize } from "../../common/middleware/authorize.js";
import { validateRequest } from "../../common/validation/validateRequest.js";
import { PeopleService } from "./people.service.js";
import {
  createAdminPersonSchema,
  listAdminPeopleQuerySchema,
  personIdParamsSchema,
  updateAdminPersonSchema,
} from "./people.schema.js";

const PEOPLE_READ_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.MODERATOR];
const PEOPLE_WRITE_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF];

const statusMap: Record<"draft" | "published" | "archived", PersonStatus> = {
  draft: PersonStatus.DRAFT,
  published: PersonStatus.ACTIVE,
  archived: PersonStatus.ARCHIVED,
};

const peopleService = new PeopleService();
export const adminPeopleRouter = Router();

adminPeopleRouter.use(authenticate);

adminPeopleRouter.get("/", authorize(PEOPLE_READ_ROLES), validateRequest(listAdminPeopleQuerySchema), async (req, res, next) => {
  try {
    const query = listAdminPeopleQuerySchema.shape.query.parse(req.query);
    const records = await peopleService.listAdminPeople({
      scope: query.scope,
      search: query.search,
      status: query.status ? statusMap[query.status] : undefined,
    });

    res.status(200).json({ data: records });
  } catch (error) {
    next(error);
  }
});

adminPeopleRouter.get("/:id", authorize(PEOPLE_READ_ROLES), validateRequest(personIdParamsSchema), async (req, res, next) => {
  try {
    const { id } = personIdParamsSchema.shape.params.parse(req.params);
    const record = await peopleService.getAdminPersonById(id);

    res.status(200).json({ data: record });
  } catch (error) {
    next(error);
  }
});

adminPeopleRouter.post("/", authorize(PEOPLE_WRITE_ROLES), validateRequest(createAdminPersonSchema), async (req, res, next) => {
  try {
    const input = createAdminPersonSchema.shape.body.parse(req.body);
    const record = await peopleService.createAdminPerson(input);

    res.status(201).json({ data: record });
  } catch (error) {
    next(error);
  }
});

adminPeopleRouter.patch("/:id", authorize(PEOPLE_WRITE_ROLES), validateRequest(updateAdminPersonSchema), async (req, res, next) => {
  try {
    const { id } = updateAdminPersonSchema.shape.params.parse(req.params);
    const input = updateAdminPersonSchema.shape.body.parse(req.body);
    const record = await peopleService.updateAdminPerson(id, input);

    res.status(200).json({ data: record });
  } catch (error) {
    next(error);
  }
});

adminPeopleRouter.delete("/:id", authorize(PEOPLE_WRITE_ROLES), validateRequest(personIdParamsSchema), async (req, res, next) => {
  try {
    const { id } = personIdParamsSchema.shape.params.parse(req.params);
    await peopleService.archiveAdminPerson(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
