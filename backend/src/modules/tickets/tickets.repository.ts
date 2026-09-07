import {
  CheckInMethod,
  TicketStatus,
  type Prisma,
  type PrismaClient,
  type TicketDeliveryStatus,
  type TicketEmailDeliveryAttemptStatus,
  type TicketEmailDeliveryTrigger,
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { AdminTicketSearchFilters, SerializedTicketStatus } from "./tickets.types.js";

type DbClient = PrismaClient | Prisma.TransactionClient;

const publicTicketInclude = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      buyerName: true,
      buyerPhone: true,
      status: true,
    },
  },
  event: {
    select: {
      id: true,
      slug: true,
      title: true,
      startAt: true,
      endAt: true,
      venueName: true,
      timezone: true,
    },
  },
  ticketTier: {
    select: {
      id: true,
      name: true,
    },
  },
  checkIns: {
    orderBy: [{ checkedInAt: "desc" }] as const,
    take: 1,
  },
} satisfies Prisma.TicketInclude;

const issuanceOrderInclude = {
  event: {
    select: {
      id: true,
      slug: true,
      title: true,
      startAt: true,
      endAt: true,
      venueName: true,
      timezone: true,
    },
  },
  items: {
    orderBy: [{ createdAt: "asc" }] as const,
    include: {
      ticketTier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  tickets: {
    orderBy: [{ issuedAt: "asc" }] as const,
    include: {
      checkIns: {
        orderBy: [{ checkedInAt: "desc" }] as const,
        take: 1,
      },
      ticketTier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

const ticketDeliveryOrderInclude = {
  event: {
    select: {
      id: true,
      slug: true,
      title: true,
      startAt: true,
      endAt: true,
      venueName: true,
      timezone: true,
    },
  },
  tickets: {
    orderBy: [{ issuedAt: "asc" }] as const,
    include: publicTicketInclude,
  },
} satisfies Prisma.OrderInclude;

const ticketEmailDeliveryAttemptSelect = {
  id: true,
  trigger: true,
  status: true,
  recipient: true,
  attemptNumber: true,
  messageId: true,
  errorSummary: true,
  createdAt: true,
  completedAt: true,
} satisfies Prisma.TicketEmailDeliveryAttemptSelect;

const ticketEmailDeliverySummarySelect = {
  id: true,
  orderNumber: true,
  buyerEmail: true,
  ticketDeliveryStatus: true,
  ticketDeliveryAttemptCount: true,
  ticketDeliveryLastAttemptAt: true,
  ticketDeliveryNextRetryAt: true,
  ticketDeliveryLastError: true,
  tickets: {
    select: {
      id: true,
    },
  },
  ticketEmailDeliveryAttempts: {
    orderBy: [{ createdAt: "desc" }] as const,
    select: ticketEmailDeliveryAttemptSelect,
  },
} satisfies Prisma.OrderSelect;

export type PublicTicketWithRelations = Prisma.TicketGetPayload<{
  include: typeof publicTicketInclude;
}>;

export type IssuanceOrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof issuanceOrderInclude;
}>;

export type TicketDeliveryOrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof ticketDeliveryOrderInclude;
}>;

export type TicketEmailDeliverySummaryWithAttempts = Prisma.OrderGetPayload<{
  select: typeof ticketEmailDeliverySummarySelect;
}>;

function getClient(tx?: Prisma.TransactionClient): DbClient {
  return tx ?? prisma;
}

export class TicketsRepository {
  async withTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction((tx) => callback(tx));
  }

  async getTicketByPublicToken(publicTicketToken: string) {
    return prisma.ticket.findUnique({
      where: { publicTicketToken },
      include: publicTicketInclude,
    });
  }

  async getOrderForTicketIssuance(orderId: string, tx?: Prisma.TransactionClient) {
    const client = getClient(tx);
    return client.order.findUnique({
      where: { id: orderId },
      include: issuanceOrderInclude,
    });
  }

  async getOrderForTicketDelivery(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: ticketDeliveryOrderInclude,
    });
  }

  async getTicketEmailDeliverySummary(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      select: ticketEmailDeliverySummarySelect,
    });
  }

  async listDueTicketEmailDeliveryOrderIds(now: Date, limit: number, maxAttempts: number) {
    const orders = await prisma.order.findMany({
      where: {
        ticketDeliveryStatus: {
          in: ["PENDING", "FAILED"],
        },
        ticketDeliveryAttemptCount: {
          lt: maxAttempts,
        },
        buyerEmail: {
          not: null,
        },
        tickets: {
          some: {},
        },
        OR: [
          {
            ticketDeliveryNextRetryAt: {
              lte: now,
            },
          },
          {
            ticketDeliveryNextRetryAt: null,
            ticketDeliveryAttemptCount: 0,
          },
        ],
      },
      orderBy: [{ ticketDeliveryNextRetryAt: "asc" }, { updatedAt: "asc" }],
      take: limit,
      select: {
        id: true,
      },
    });

    return orders.map((order) => order.id);
  }

  async createTicket(
    input: {
      ticketNumber: string;
      publicTicketToken: string;
      qrCodeValue: string;
      orderId: string;
      orderItemId: string;
      sequenceNumber: number;
      eventId: string;
      ticketTierId: string;
      buyerId: string;
      issuedAt: Date;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.ticket.create({
      data: {
        ticketNumber: input.ticketNumber,
        publicTicketToken: input.publicTicketToken,
        qrCodeValue: input.qrCodeValue,
        orderId: input.orderId,
        orderItemId: input.orderItemId,
        sequenceNumber: input.sequenceNumber,
        eventId: input.eventId,
        ticketTierId: input.ticketTierId,
        buyerId: input.buyerId,
        issuedAt: input.issuedAt,
      },
      include: publicTicketInclude,
    });
  }

  async listAdminTickets(filters: AdminTicketSearchFilters) {
    const where: Prisma.TicketWhereInput = {
      eventId: filters.eventId,
      status:
        filters.ticketStatus === "checked_in"
          ? TicketStatus.CHECKED_IN
          : filters.ticketStatus === "revoked"
            ? TicketStatus.REVOKED
            : filters.ticketStatus === "cancelled"
              ? TicketStatus.CANCELLED
              : filters.ticketStatus === "active"
                ? TicketStatus.ACTIVE
                : undefined,
      OR: [
        { ticketNumber: { contains: filters.query } },
        { publicTicketToken: { contains: filters.query } },
        { qrCodeValue: { contains: filters.query } },
        { order: { orderNumber: { contains: filters.query } } },
        { order: { buyerName: { contains: filters.query } } },
        { order: { buyerPhone: { contains: filters.query } } },
        { event: { title: { contains: filters.query } } },
      ],
    };

    return prisma.ticket.findMany({
      where,
      take: filters.limit,
      orderBy: [{ issuedAt: "desc" }],
      include: publicTicketInclude,
    });
  }

  async findTicketByLookup(query: string, tx?: Prisma.TransactionClient) {
    const client = getClient(tx);

    return client.ticket.findFirst({
      where: {
        OR: [{ ticketNumber: query }, { publicTicketToken: query }, { qrCodeValue: query }],
      },
      include: publicTicketInclude,
    });
  }

  async applyTicketCheckIn(
    input: {
      ticketId: string;
      checkedInByUserId: string;
      method: CheckInMethod;
      checkpointLabel?: string;
      notes?: string;
      checkedInAt: Date;
    },
    tx: Prisma.TransactionClient,
  ) {
    const updated = await tx.ticket.updateMany({
      where: {
        id: input.ticketId,
        status: TicketStatus.ACTIVE,
      },
      data: {
        status: TicketStatus.CHECKED_IN,
      },
    });

    if (updated.count !== 1) {
      return null;
    }

    await tx.ticketCheckIn.create({
      data: {
        ticketId: input.ticketId,
        checkedInByUserId: input.checkedInByUserId,
        method: input.method,
        checkpointLabel: input.checkpointLabel,
        notes: input.notes,
        checkedInAt: input.checkedInAt,
      },
    });

    return tx.ticket.findUnique({
      where: { id: input.ticketId },
      include: publicTicketInclude,
    });
  }

  async updateOrderTicketDeliveryStatus(orderId: string, status: TicketDeliveryStatus, tx?: Prisma.TransactionClient) {
    const client = getClient(tx);

    return client.order.update({
      where: { id: orderId },
      data: {
        ticketDeliveryStatus: status,
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });
  }

  async recordTicketEmailDeliveryAttempt(input: {
    orderId: string;
    trigger: TicketEmailDeliveryTrigger;
    status: TicketEmailDeliveryAttemptStatus;
    ticketDeliveryStatus: TicketDeliveryStatus;
    recipient?: string | null;
    attemptNumber: number;
    messageId?: string | null;
    errorSummary?: string | null;
    completedAt: Date;
    nextRetryAt?: Date | null;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.ticketEmailDeliveryAttempt.create({
        data: {
          orderId: input.orderId,
          trigger: input.trigger,
          status: input.status,
          recipient: input.recipient,
          attemptNumber: input.attemptNumber,
          messageId: input.messageId,
          errorSummary: input.errorSummary,
          completedAt: input.completedAt,
        },
      });

      return tx.order.update({
        where: { id: input.orderId },
        data: {
          ticketDeliveryStatus: input.ticketDeliveryStatus,
          ticketDeliveryAttemptCount: input.attemptNumber,
          ticketDeliveryLastAttemptAt: input.completedAt,
          ticketDeliveryNextRetryAt: input.nextRetryAt,
          ticketDeliveryLastError: input.errorSummary ?? null,
        },
        select: ticketEmailDeliverySummarySelect,
      });
    });
  }
}

export function mapTicketStatus(status: TicketStatus): SerializedTicketStatus {
  if (status === TicketStatus.CHECKED_IN) return "checked_in";
  if (status === TicketStatus.REVOKED) return "revoked";
  if (status === TicketStatus.CANCELLED) return "cancelled";
  return "active";
}
