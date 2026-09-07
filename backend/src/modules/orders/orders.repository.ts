import {
  EventStatus,
  OrderStatus,
  PaymentStatus,
  PaymentVerificationStatus,
  Prisma,
  type PaymentProvider,
  TicketStatus,
  TicketTierStatus,
  type PrismaClient,
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { AdminOrdersListFilters } from "./orders.types.js";

const orderInclude = {
  event: {
    select: {
      id: true,
      slug: true,
      title: true,
      startAt: true,
      endAt: true,
      venueName: true,
    },
  },
  items: {
    orderBy: [{ createdAt: "asc" }] as const,
    include: {
      ticketTier: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  },
  paymentTransactions: {
    orderBy: [{ createdAt: "desc" }] as const,
  },
  paymentProofSubmissions: {
    orderBy: [{ submittedAt: "desc" }] as const,
    include: {
      reviewedBy: {
        select: {
          id: true,
          fullName: true,
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
    },
  },
} satisfies Prisma.OrderInclude;

type DbClient = PrismaClient | Prisma.TransactionClient;

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

export type EventForOrderRecord = {
  id: string;
  slug: string;
  title: string;
  status: EventStatus;
  startAt: Date;
  endAt: Date;
  timezone: string;
};

export type TierForOrderRecord = {
  id: string;
  eventId: string;
  name: string;
  price: Prisma.Decimal;
  currency: string;
  availableQuantity: number;
  maxPerOrder: number | null;
  saleStartAt: Date | null;
  saleEndAt: Date | null;
  status: TicketTierStatus;
};

export type CreateOrderWriteInput = {
  orderNumber: string;
  publicToken: string;
  eventId: string;
  buyer: {
    buyerName: string;
    buyerPhone: string;
    buyerEmail?: string;
  };
  status: OrderStatus;
  currency: string;
  subtotalAmount: Prisma.Decimal | number;
  totalAmount: Prisma.Decimal | number;
  reservationExpiresAt: Date;
  notes?: string;
  items: Array<{
    ticketTierId: string;
    quantity: number;
    unitPrice: Prisma.Decimal | number;
    lineTotal: Prisma.Decimal | number;
  }>;
  payment: {
    provider: PaymentProvider;
    status: PaymentStatus;
    amount: Prisma.Decimal | number;
    currency: string;
    idempotencyKey?: string;
    providerReference?: string;
    externalRequestId?: string;
    rawRequest?: Prisma.InputJsonValue;
  };
};

function getClient(tx?: Prisma.TransactionClient): DbClient {
  return tx ?? prisma;
}

export class OrdersRepository {
  async withTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await prisma.$transaction((tx) => callback(tx), {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        });
      } catch (error) {
        const retryable = error instanceof Prisma.PrismaClientKnownRequestError
          && ((error.code === "P2034") || (error.code === "P2010" && /deadlock|lock wait timeout|1213|1205/i.test(error.message)));
        if (!retryable || attempt === 2) throw error;
      }
    }

    throw new Error("Transaction retry limit reached");
  }

  async expirePendingOrders(now: Date, tx?: Prisma.TransactionClient) {
    const client = getClient(tx);

    await client.order.updateMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        reservationExpiresAt: { lte: now },
      },
      data: {
        status: OrderStatus.EXPIRED,
        expiredAt: now,
      },
    });

    await client.paymentTransaction.updateMany({
      where: {
        status: {
          in: [PaymentStatus.INITIATED, PaymentStatus.PENDING],
        },
        order: {
          status: OrderStatus.EXPIRED,
        },
      },
      data: {
        status: PaymentStatus.FAILED,
        completedAt: now,
        resultCode: "ORDER_EXPIRED",
        resultMessage: "Reservation expired before payment confirmation",
      },
    });
  }

  async findEventById(eventId: string, tx?: Prisma.TransactionClient): Promise<EventForOrderRecord | null> {
    const client = getClient(tx);
    return client.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        startAt: true,
        endAt: true,
        timezone: true,
      },
    });
  }

  async findTicketTiersForEvent(eventId: string, ticketTierIds: string[], tx?: Prisma.TransactionClient): Promise<TierForOrderRecord[]> {
    const client = getClient(tx);
    return client.ticketTier.findMany({
      where: {
        eventId,
        id: { in: ticketTierIds },
      },
      select: {
        id: true,
        eventId: true,
        name: true,
        price: true,
        currency: true,
        availableQuantity: true,
        maxPerOrder: true,
        saleStartAt: true,
        saleEndAt: true,
        status: true,
      },
    });
  }

  async getReservedQuantities(ticketTierIds: string[], now: Date, tx?: Prisma.TransactionClient) {
    if (ticketTierIds.length === 0) {
      return new Map<string, number>();
    }

    const client = getClient(tx);

    const grouped = await client.orderItem.groupBy({
      by: ["ticketTierId"],
      where: {
        ticketTierId: {
          in: ticketTierIds,
        },
        order: {
          OR: [
            {
              status: OrderStatus.PAID,
            },
            {
              status: {
                in: [OrderStatus.PAYMENT_SUBMITTED, OrderStatus.PAYMENT_REJECTED, OrderStatus.PAYMENT_VERIFIED],
              },
            },
            {
              status: OrderStatus.PENDING_PAYMENT,
              reservationExpiresAt: {
                gt: now,
              },
            },
          ],
        },
      },
      _sum: {
        quantity: true,
      },
    });

    return new Map(grouped.map((entry) => [entry.ticketTierId, entry._sum.quantity ?? 0]));
  }

  async orderNumberExists(orderNumber: string, tx?: Prisma.TransactionClient) {
    const client = getClient(tx);
    const existing = await client.order.findUnique({
      where: { orderNumber },
      select: { id: true },
    });

    return Boolean(existing);
  }

  async publicTokenExists(publicToken: string, tx?: Prisma.TransactionClient) {
    const client = getClient(tx);
    const existing = await client.order.findUnique({
      where: { publicToken },
      select: { id: true },
    });

    return Boolean(existing);
  }

  async findOrderByIdempotencyKey(idempotencyKey: string, tx?: Prisma.TransactionClient) {
    const client = getClient(tx);
    const record = await client.paymentTransaction.findUnique({
      where: { idempotencyKey },
      include: {
        order: {
          include: orderInclude,
        },
      },
    });

    return record?.order ?? null;
  }

  async lockTicketTiersForUpdate(eventId: string, ticketTierIds: string[], tx: Prisma.TransactionClient) {
    if (ticketTierIds.length === 0) return;

    await tx.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT id FROM TicketTier WHERE eventId = ${eventId} AND id IN (${Prisma.join(ticketTierIds)}) ORDER BY id FOR UPDATE`,
    );
  }

  async createOrder(data: CreateOrderWriteInput, tx: Prisma.TransactionClient): Promise<OrderWithRelations> {
    const buyer = await tx.buyerProfile.create({
      data: {
        fullName: data.buyer.buyerName,
        phone: data.buyer.buyerPhone,
        email: data.buyer.buyerEmail,
      },
    });

    return tx.order.create({
      data: {
        orderNumber: data.orderNumber,
        publicToken: data.publicToken,
        eventId: data.eventId,
        buyerId: buyer.id,
        buyerName: data.buyer.buyerName,
        buyerPhone: data.buyer.buyerPhone,
        buyerEmail: data.buyer.buyerEmail,
        status: data.status,
        currency: data.currency,
        subtotalAmount: data.subtotalAmount,
        totalAmount: data.totalAmount,
        reservationExpiresAt: data.reservationExpiresAt,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            ticketTierId: item.ticketTierId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        },
        paymentTransactions: {
          create: {
            provider: data.payment.provider,
            status: data.payment.status,
            amount: data.payment.amount,
            currency: data.payment.currency,
            idempotencyKey: data.payment.idempotencyKey,
            providerReference: data.payment.providerReference,
            externalRequestId: data.payment.externalRequestId,
            rawRequest: data.payment.rawRequest,
          },
        },
      },
      include: orderInclude,
    });
  }

  async getOrderByPublicToken(publicToken: string) {
    return prisma.order.findUnique({
      where: { publicToken },
      include: orderInclude,
    });
  }

  async getOrderByOrderNumber(orderNumber: string) {
    return prisma.order.findUnique({
      where: { orderNumber },
      include: orderInclude,
    });
  }

  async listAdminOrders(filters: AdminOrdersListFilters) {
    const where: Prisma.OrderWhereInput = {
      status:
        filters.status === "pending_payment"
          ? OrderStatus.PENDING_PAYMENT
          : filters.status === "payment_submitted"
            ? OrderStatus.PAYMENT_SUBMITTED
            : filters.status === "payment_verified"
              ? OrderStatus.PAYMENT_VERIFIED
              : filters.status === "payment_rejected"
                ? OrderStatus.PAYMENT_REJECTED
                : filters.status === "paid"
                  ? OrderStatus.PAID
                  : filters.status === "expired"
                    ? OrderStatus.EXPIRED
                    : undefined,
      eventId: filters.eventId,
      OR: filters.search
        ? [
            { orderNumber: { contains: filters.search } },
            { buyerName: { contains: filters.search } },
            { buyerPhone: { contains: filters.search } },
            { buyerEmail: { contains: filters.search } },
            { event: { title: { contains: filters.search } } },
          ]
        : undefined,
    };

    return prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: orderInclude,
    });
  }

  async getAdminOrderById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
  }
}

export function mapTicketStatusForSerialization(status: TicketStatus) {
  if (status === TicketStatus.CHECKED_IN) return "checked_in" as const;
  if (status === TicketStatus.REVOKED) return "revoked" as const;
  if (status === TicketStatus.CANCELLED) return "cancelled" as const;
  return "active" as const;
}

export function mapVerificationStatus(proofStatus?: PaymentVerificationStatus) {
  if (proofStatus === PaymentVerificationStatus.APPROVED) return "approved" as const;
  if (proofStatus === PaymentVerificationStatus.REJECTED) return "rejected" as const;
  if (proofStatus === PaymentVerificationStatus.PENDING) return "pending_review" as const;
  return "not_submitted" as const;
}
