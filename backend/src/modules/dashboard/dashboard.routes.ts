import { EventStatus, ModerationStatus, OrderStatus, PartnerStatus, PersonRoleType, PersonStatus, TicketStatus } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.js";
import { ADMIN_ACCESS_ROLES, authorize } from "../../common/middleware/authorize.js";
import { prisma } from "../../lib/prisma.js";

export const adminStatsRouter = Router();

adminStatsRouter.use(authenticate, authorize(ADMIN_ACCESS_ROLES));

adminStatsRouter.get("/", async (_req, res, next) => {
  try {
    const now = new Date();

    const [upcomingEventsCount, pastEventsCount, ticketsSold, paidOrders, pendingOrders, pendingUploads, artistsCount, partnersCount] =
      await Promise.all([
        prisma.event.count({
          where: {
            status: EventStatus.PUBLISHED,
            endAt: { gte: now },
          },
        }),
        prisma.event.count({
          where: {
            status: EventStatus.PUBLISHED,
            endAt: { lt: now },
          },
        }),
        prisma.ticket.count({
          where: {
            status: { in: [TicketStatus.ACTIVE, TicketStatus.CHECKED_IN] },
          },
        }),
        prisma.order.count({
          where: {
            status: { in: [OrderStatus.PAID, OrderStatus.PAYMENT_VERIFIED] },
          },
        }),
        prisma.order.count({
          where: {
            status: {
              in: [OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_SUBMITTED, OrderStatus.PAYMENT_REJECTED],
            },
          },
        }),
        prisma.communityUpload.count({
          where: { status: ModerationStatus.PENDING },
        }),
        prisma.person.count({
          where: {
            status: PersonStatus.ACTIVE,
            roles: { some: { role: PersonRoleType.ARTIST } },
          },
        }),
        prisma.partner.count({
          where: { status: PartnerStatus.ACTIVE },
        }),
      ]);

    res.status(200).json({
      data: {
        upcomingEventsCount,
        pastEventsCount,
        ticketsSold,
        paidOrders,
        pendingOrders,
        pendingUploads,
        artistsCount,
        partnersCount,
        generatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});
