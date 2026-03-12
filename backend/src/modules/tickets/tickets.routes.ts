import { UserRole } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.js";
import { authorize } from "../../common/middleware/authorize.js";
import { validateRequest } from "../../common/validation/validateRequest.js";
import { TicketsService } from "./tickets.service.js";
import {
  adminTicketVerifyParamsSchema,
  adminIssueOrderTicketsParamsSchema,
  adminTicketCheckInSchema,
  adminTicketSearchQuerySchema,
  publicTicketTokenParamsSchema,
} from "./tickets.schema.js";

const TICKET_ADMIN_VIEW_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.MODERATOR];
const TICKET_ADMIN_CHECK_IN_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF];
const TICKET_ISSUE_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF];

const ticketsService = new TicketsService();

export const ticketsRouter = Router();
export const adminTicketsRouter = Router();

ticketsRouter.get("/:publicTicketToken", validateRequest(publicTicketTokenParamsSchema), async (req, res, next) => {
  try {
    const { publicTicketToken } = publicTicketTokenParamsSchema.shape.params.parse(req.params);
    const ticket = await ticketsService.getPublicTicketByToken(publicTicketToken);

    res.status(200).json({ data: ticket });
  } catch (error) {
    next(error);
  }
});

ticketsRouter.get(
  "/:publicTicketToken/download",
  validateRequest(publicTicketTokenParamsSchema),
  async (req, res, next) => {
    try {
      const { publicTicketToken } = publicTicketTokenParamsSchema.shape.params.parse(req.params);
      const file = await ticketsService.getPublicTicketDownloadByToken(publicTicketToken);

      res.setHeader("Content-Type", file.contentType);
      res.setHeader("Content-Disposition", file.contentDisposition);
      res.setHeader("Content-Length", String(file.payload.length));
      res.status(200).send(file.payload);
    } catch (error) {
      next(error);
    }
  },
);

adminTicketsRouter.use(authenticate);

adminTicketsRouter.get(
  "/search",
  authorize(TICKET_ADMIN_VIEW_ROLES),
  validateRequest(adminTicketSearchQuerySchema),
  async (req, res, next) => {
    try {
      const query = adminTicketSearchQuerySchema.shape.query.parse(req.query);
      const tickets = await ticketsService.searchAdminTickets({
        query: query.query,
        eventId: query.eventId,
        ticketStatus: query.ticketStatus,
        limit: query.limit ?? 20,
      });

      res.status(200).json({ data: tickets });
    } catch (error) {
      next(error);
    }
  },
);

adminTicketsRouter.get(
  "/verify/:publicTicketToken",
  authorize(TICKET_ADMIN_VIEW_ROLES),
  validateRequest(adminTicketVerifyParamsSchema),
  async (req, res, next) => {
    try {
      const { publicTicketToken } = adminTicketVerifyParamsSchema.shape.params.parse(req.params);
      const result = await ticketsService.verifyAdminTicket(publicTicketToken);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  },
);

adminTicketsRouter.post(
  "/check-in",
  authorize(TICKET_ADMIN_CHECK_IN_ROLES),
  validateRequest(adminTicketCheckInSchema),
  async (req, res, next) => {
    try {
      const input = adminTicketCheckInSchema.shape.body.parse(req.body);
      const result = await ticketsService.checkInTicket(input, req.auth!.user.id);

      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  },
);

adminTicketsRouter.post(
  "/issue/order/:orderId",
  authorize(TICKET_ISSUE_ROLES),
  validateRequest(adminIssueOrderTicketsParamsSchema),
  async (req, res, next) => {
    try {
      const { orderId } = adminIssueOrderTicketsParamsSchema.shape.params.parse(req.params);
      const result = await ticketsService.issueTicketsForOrderByAdmin(orderId);

      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  },
);
