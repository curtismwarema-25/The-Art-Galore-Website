import { EventStatus, OrderStatus, PaymentProvider, PaymentStatus, type Prisma, TicketTierStatus } from "@prisma/client";
import { randomBytes, randomInt } from "node:crypto";
import { NotFoundError, ValidationError } from "../../common/errors/httpErrors.js";
import { env } from "../../config/index.js";
import {
  mapTicketStatusForSerialization,
  mapVerificationStatus,
  OrdersRepository,
  type CreateOrderWriteInput,
  type EventForOrderRecord,
  type OrderWithRelations,
  type TierForOrderRecord,
} from "./orders.repository.js";
import type {
  AdminOrdersListFilters,
  CreateOrderInput,
  CreateOrderResult,
  OrderLifecycleStatus,
  PaymentLifecycleStatus,
  PaymentProviderCode,
  PublicTrackedOrderRecord,
  SerializedOrderPaymentProof,
  SerializedOrderRecord,
  VerificationStatus,
} from "./orders.types.js";

type RequestedTier = {
  ticketTierId: string;
  quantity: number;
};

function toFixedAmount(value: number) {
  return Number(value.toFixed(2));
}

function mapOrderStatus(status: OrderStatus): OrderLifecycleStatus {
  if (status === OrderStatus.PAYMENT_SUBMITTED) return "payment_submitted";
  if (status === OrderStatus.PAYMENT_VERIFIED) return "payment_verified";
  if (status === OrderStatus.PAYMENT_REJECTED) return "payment_rejected";
  if (status === OrderStatus.PAID) return "paid";
  if (status === OrderStatus.EXPIRED) return "expired";
  return "pending_payment";
}

function mapPaymentStatus(status: PaymentStatus): PaymentLifecycleStatus {
  if (status === PaymentStatus.SUCCEEDED) return "paid";
  if (status === PaymentStatus.FAILED || status === PaymentStatus.CANCELLED || status === PaymentStatus.REFUNDED) {
    return "failed";
  }
  return "pending";
}

function mapPaymentProvider(provider: PaymentProvider): PaymentProviderCode {
  if (provider === PaymentProvider.CARD) return "card";
  if (provider === PaymentProvider.BANK) return "bank";
  if (provider === PaymentProvider.MANUAL) return "manual";
  return "mpesa";
}

function mapProofPaymentMethod(provider: PaymentProvider): SerializedOrderPaymentProof["paymentMethod"] {
  if (provider === PaymentProvider.BANK) return "bank";
  if (provider === PaymentProvider.MPESA) return "mpesa";
  return "manual";
}

function deriveOrderPaymentStatus(order: OrderWithRelations): PaymentLifecycleStatus {
  if (order.status === OrderStatus.PAID || order.status === OrderStatus.PAYMENT_VERIFIED) {
    return "paid";
  }

  if (order.status === OrderStatus.EXPIRED || order.status === OrderStatus.PAYMENT_REJECTED) {
    return "failed";
  }

  return "pending";
}

function mapOrderRecord(order: OrderWithRelations): SerializedOrderRecord {
  const latestPayment = order.paymentTransactions[0] ?? null;
  const latestProof = order.paymentProofSubmissions[0] ?? null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    publicToken: order.publicToken,
    status: mapOrderStatus(order.status),
    verificationStatus: mapVerificationStatus(latestProof?.verificationStatus),
    currency: order.currency,
    subtotalAmount: Number(order.subtotalAmount),
    totalAmount: Number(order.totalAmount),
    reservationExpiresAt: order.reservationExpiresAt.toISOString(),
    verificationSubmittedAt: order.verificationSubmittedAt?.toISOString(),
    placedAt: order.placedAt.toISOString(),
    paidAt: order.paidAt?.toISOString(),
    expiredAt: order.expiredAt?.toISOString(),
    event: {
      id: order.event.id,
      slug: order.event.slug,
      title: order.event.title,
      startAt: order.event.startAt.toISOString(),
      endAt: order.event.endAt.toISOString(),
      venueName: order.event.venueName,
    },
    buyer: {
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      buyerEmail: order.buyerEmail ?? undefined,
    },
    items: order.items.map((item) => ({
      id: item.id,
      ticketTierId: item.ticketTierId,
      ticketTierName: item.ticketTier.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
    payment: latestPayment
      ? {
          id: latestPayment.id,
          provider: mapPaymentProvider(latestPayment.provider),
          status: mapPaymentStatus(latestPayment.status),
          amount: Number(latestPayment.amount),
          currency: latestPayment.currency,
          providerReference: latestPayment.providerReference ?? undefined,
          resultCode: latestPayment.resultCode ?? undefined,
          resultMessage: latestPayment.resultMessage ?? undefined,
          initiatedAt: latestPayment.initiatedAt.toISOString(),
          completedAt: latestPayment.completedAt?.toISOString(),
        }
      : null,
    latestPaymentProof: latestProof
      ? {
          id: latestProof.id,
          paymentMethod: mapProofPaymentMethod(latestProof.paymentMethod),
          payerName: latestProof.payerName,
          phoneNumber: latestProof.phoneNumber,
          amountPaid: Number(latestProof.amountPaid),
          transactionReference: latestProof.transactionReference,
          screenshotUrl: latestProof.screenshotUrl ?? undefined,
          notes: latestProof.notes ?? undefined,
          verificationStatus: mapVerificationStatus(latestProof.verificationStatus),
          verificationNote: latestProof.verificationNote ?? undefined,
          submittedAt: latestProof.submittedAt.toISOString(),
          reviewedAt: latestProof.reviewedAt?.toISOString(),
        }
      : null,
    tickets: order.tickets.map((ticket) => ({
      ticketNumber: ticket.ticketNumber,
      publicTicketToken: ticket.publicTicketToken,
      qrCodeValue: ticket.qrCodeValue,
      ticketStatus: mapTicketStatusForSerialization(ticket.status),
      issuedAt: ticket.issuedAt.toISOString(),
      checkedInAt: ticket.checkIns[0]?.checkedInAt?.toISOString(),
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

function mapPublicTrackedOrderRecord(order: OrderWithRelations): PublicTrackedOrderRecord {
  const latestProof = order.paymentProofSubmissions[0] ?? null;
  const mappedStatus = mapOrderStatus(order.status);
  const verificationStatus = mapVerificationStatus(latestProof?.verificationStatus);

  return {
    orderNumber: order.orderNumber,
    status: mappedStatus,
    paymentStatus: deriveOrderPaymentStatus(order),
    verificationStatus,
    currency: order.currency,
    amountDue: Number(order.totalAmount),
    reservationExpiresAt: order.reservationExpiresAt.toISOString(),
    verificationSubmittedAt: order.verificationSubmittedAt?.toISOString(),
    event: {
      slug: order.event.slug,
      title: order.event.title,
      startAt: order.event.startAt.toISOString(),
      endAt: order.event.endAt.toISOString(),
      venueName: order.event.venueName,
    },
    ticketQuantities: order.items.map((item) => ({
      tierName: item.ticketTier.name,
      quantity: item.quantity,
    })),
    canSubmitPaymentProof: mappedStatus === "pending_payment" || mappedStatus === "payment_rejected",
    tickets: order.tickets.map((ticket) => ({
      ticketNumber: ticket.ticketNumber,
      publicTicketToken: ticket.publicTicketToken,
      ticketStatus: mapTicketStatusForSerialization(ticket.status),
      issuedAt: ticket.issuedAt.toISOString(),
    })),
  };
}

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "");
}

function normalizeItems(items: RequestedTier[]) {
  const itemMap = new Map<string, number>();

  for (const item of items) {
    const existingQuantity = itemMap.get(item.ticketTierId) ?? 0;
    itemMap.set(item.ticketTierId, existingQuantity + item.quantity);
  }

  return Array.from(itemMap.entries()).map(([ticketTierId, quantity]) => ({ ticketTierId, quantity }));
}

export class OrdersService {
  constructor(private readonly repository: OrdersRepository = new OrdersRepository()) {}

  private createOrderNumber(date: Date) {
    const stamp = date.toISOString().slice(0, 10).replace(/-/g, "");
    return `ORD-${stamp}-${randomInt(100000, 999999)}`;
  }

  private createPublicToken() {
    return randomBytes(32).toString("base64url");
  }

  private async getUniqueOrderNumber(tx: Prisma.TransactionClient, now: Date) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = this.createOrderNumber(now);
      const exists = await this.repository.orderNumberExists(candidate, tx);

      if (!exists) {
        return candidate;
      }
    }

    throw new ValidationError("Unable to generate a unique order number");
  }

  private async getUniquePublicToken(tx: Prisma.TransactionClient) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = this.createPublicToken();
      const exists = await this.repository.publicTokenExists(candidate, tx);

      if (!exists) {
        return candidate;
      }
    }

    throw new ValidationError("Unable to generate a secure order tracking token");
  }

  private assertEventCanSellTickets(event: EventForOrderRecord, now: Date) {
    if (event.status !== EventStatus.PUBLISHED) {
      throw new ValidationError("Event is not available for ticket sales");
    }

    if (event.endAt <= now) {
      throw new ValidationError("Ticket sales for this event have ended");
    }
  }

  private validateTierAvailability(
    tiers: TierForOrderRecord[],
    requestedItems: RequestedTier[],
    reservedQuantities: Map<string, number>,
    now: Date,
  ) {
    const byId = new Map(tiers.map((tier) => [tier.id, tier]));
    const currencies = new Set<string>();
    let subtotalAmount = 0;

    const pricedItems = requestedItems.map((item) => {
      const tier = byId.get(item.ticketTierId);
      if (!tier) {
        throw new ValidationError("One or more ticket tiers are invalid for this event");
      }

      if (tier.status !== TicketTierStatus.ACTIVE) {
        throw new ValidationError(`Ticket tier \"${tier.name}\" is not available for purchase`);
      }

      if (tier.saleStartAt && tier.saleStartAt > now) {
        throw new ValidationError(`Ticket sales for \"${tier.name}\" have not started`);
      }

      if (tier.saleEndAt && tier.saleEndAt < now) {
        throw new ValidationError(`Ticket sales for \"${tier.name}\" have ended`);
      }

      if (tier.maxPerOrder && item.quantity > tier.maxPerOrder) {
        throw new ValidationError(`Ticket tier \"${tier.name}\" allows maximum ${tier.maxPerOrder} per order`);
      }

      const reserved = reservedQuantities.get(tier.id) ?? 0;
      const available = Math.max(tier.availableQuantity - reserved, 0);

      if (item.quantity > available) {
        throw new ValidationError(`Ticket tier \"${tier.name}\" has only ${available} ticket(s) remaining`);
      }

      currencies.add(tier.currency);

      const unitPrice = Number(tier.price);
      const lineTotal = toFixedAmount(unitPrice * item.quantity);
      subtotalAmount = toFixedAmount(subtotalAmount + lineTotal);

      return {
        ticketTierId: tier.id,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });

    if (currencies.size !== 1) {
      throw new ValidationError("Selected ticket tiers must use the same currency");
    }

    const [currency] = currencies;

    return {
      currency,
      subtotalAmount,
      totalAmount: subtotalAmount,
      items: pricedItems,
    };
  }

  async createOrder(input: CreateOrderInput, idempotencyKey?: string): Promise<CreateOrderResult> {
    const now = new Date();
    const normalizedKey = idempotencyKey?.trim();
    const normalizedBuyer = {
      buyerName: input.buyer.buyerName.trim(),
      buyerPhone: normalizePhone(input.buyer.buyerPhone),
      buyerEmail: input.buyer.buyerEmail?.trim() || undefined,
    };
    const requestedItems = normalizeItems(input.items);

    if (requestedItems.length === 0) {
      throw new ValidationError("At least one ticket tier must be selected");
    }

    if (normalizedKey && normalizedKey.length > 191) {
      throw new ValidationError("Idempotency-Key header is too long");
    }

    await this.repository.expirePendingOrders(now);

    if (normalizedKey) {
      const existingOrder = await this.repository.findOrderByIdempotencyKey(normalizedKey);
      if (existingOrder) {
        return {
          order: mapOrderRecord(existingOrder),
          idempotentReplay: true,
        };
      }
    }

    const createdOrder = await this.repository.withTransaction(async (tx) => {
      await this.repository.expirePendingOrders(now, tx);

      const event = await this.repository.findEventById(input.eventId, tx);
      if (!event) {
        throw new NotFoundError("Event not found");
      }
      this.assertEventCanSellTickets(event, now);

      const ticketTierIds = requestedItems.map((item) => item.ticketTierId);
      const tiers = await this.repository.findTicketTiersForEvent(input.eventId, ticketTierIds, tx);
      if (tiers.length !== ticketTierIds.length) {
        throw new ValidationError("One or more ticket tiers are invalid for this event");
      }

      const reservedQuantities = await this.repository.getReservedQuantities(ticketTierIds, now, tx);
      const pricing = this.validateTierAvailability(tiers, requestedItems, reservedQuantities, now);
      const reservationExpiresAt = new Date(now.getTime() + env.ORDER_RESERVATION_TTL_MINUTES * 60 * 1000);

      const writeInput: CreateOrderWriteInput = {
        orderNumber: await this.getUniqueOrderNumber(tx, now),
        publicToken: await this.getUniquePublicToken(tx),
        eventId: event.id,
        buyer: normalizedBuyer,
        status: OrderStatus.PENDING_PAYMENT,
        currency: pricing.currency,
        subtotalAmount: pricing.subtotalAmount,
        totalAmount: pricing.totalAmount,
        reservationExpiresAt,
        items: pricing.items,
        payment: {
          provider: PaymentProvider.MANUAL,
          status: PaymentStatus.PENDING,
          amount: pricing.totalAmount,
          currency: pricing.currency,
          idempotencyKey: normalizedKey,
          providerReference: undefined,
          externalRequestId: undefined,
          rawRequest: {
            source: "order-create",
            manualFallback: true,
          },
        },
      };

      return this.repository.createOrder(writeInput, tx);
    });

    return {
      order: mapOrderRecord(createdOrder),
      idempotentReplay: false,
    };
  }

  async getPublicTrackedOrder(publicToken: string): Promise<PublicTrackedOrderRecord> {
    await this.repository.expirePendingOrders(new Date());

    const order = await this.repository.getOrderByPublicToken(publicToken);
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    return mapPublicTrackedOrderRecord(order);
  }

  async listAdminOrders(filters: AdminOrdersListFilters) {
    await this.repository.expirePendingOrders(new Date());
    const orders = await this.repository.listAdminOrders(filters);
    return orders.map(mapOrderRecord);
  }

  async getAdminOrderById(id: string) {
    await this.repository.expirePendingOrders(new Date());
    const order = await this.repository.getAdminOrderById(id);
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    return mapOrderRecord(order);
  }
}

export function toVerificationStatus(order: OrderWithRelations): VerificationStatus {
  return mapVerificationStatus(order.paymentProofSubmissions[0]?.verificationStatus);
}
