import { EventStatus, OrderStatus, PaymentProvider, PaymentStatus, TicketTierStatus, type Prisma } from "@prisma/client";
import { randomInt } from "node:crypto";
import { NotFoundError, ValidationError } from "../../common/errors/httpErrors.js";
import { env } from "../../config/index.js";
import {
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
  SerializedOrderRecord,
} from "./orders.types.js";

type RequestedTier = {
  ticketTierId: string;
  quantity: number;
};

function toFixedAmount(value: number) {
  return Number(value.toFixed(2));
}

function mapOrderStatus(status: OrderStatus): OrderLifecycleStatus {
  if (status === OrderStatus.PAID) return "paid";
  if (status === OrderStatus.FAILED) return "failed";
  if (status === OrderStatus.EXPIRED) return "expired";
  if (status === OrderStatus.REFUNDED) return "refunded";
  return "pending";
}

function mapPaymentStatus(status: PaymentStatus): PaymentLifecycleStatus {
  if (status === PaymentStatus.SUCCEEDED) return "paid";
  if (status === PaymentStatus.REFUNDED) return "refunded";
  if (status === PaymentStatus.FAILED || status === PaymentStatus.CANCELLED) return "failed";
  return "pending";
}

function mapPaymentProvider(provider: PaymentProvider): PaymentProviderCode {
  if (provider === PaymentProvider.CARD) return "card";
  if (provider === PaymentProvider.BANK) return "bank";
  if (provider === PaymentProvider.MANUAL) return "manual";
  return "mpesa";
}

function mapOrderRecord(order: OrderWithRelations): SerializedOrderRecord {
  const latestPayment = order.paymentTransactions[0] ?? null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: mapOrderStatus(order.status),
    currency: order.currency,
    subtotalAmount: Number(order.subtotalAmount),
    totalAmount: Number(order.totalAmount),
    reservationExpiresAt: order.reservationExpiresAt.toISOString(),
    placedAt: order.placedAt.toISOString(),
    paidAt: order.paidAt?.toISOString(),
    expiredAt: order.expiredAt?.toISOString(),
    refundedAt: order.refundedAt?.toISOString(),
    event: {
      id: order.event.id,
      slug: order.event.slug,
      title: order.event.title,
    },
    buyer: {
      fullName: order.buyerFullName,
      phone: order.buyerPhone,
      email: order.buyerEmail ?? undefined,
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
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
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
        throw new ValidationError(`Ticket tier "${tier.name}" is not available for purchase`);
      }

      if (tier.saleStartAt && tier.saleStartAt > now) {
        throw new ValidationError(`Ticket sales for "${tier.name}" have not started`);
      }

      if (tier.saleEndAt && tier.saleEndAt < now) {
        throw new ValidationError(`Ticket sales for "${tier.name}" have ended`);
      }

      if (tier.maxPerOrder && item.quantity > tier.maxPerOrder) {
        throw new ValidationError(`Ticket tier "${tier.name}" allows maximum ${tier.maxPerOrder} per order`);
      }

      const reserved = reservedQuantities.get(tier.id) ?? 0;
      const available = Math.max(tier.availableQuantity - reserved, 0);

      if (item.quantity > available) {
        throw new ValidationError(`Ticket tier "${tier.name}" has only ${available} ticket(s) remaining`);
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
      fullName: input.buyer.fullName.trim(),
      phone: normalizePhone(input.buyer.phone),
      email: input.buyer.email?.trim() || undefined,
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
        eventId: event.id,
        buyer: normalizedBuyer,
        status: OrderStatus.PENDING,
        currency: pricing.currency,
        subtotalAmount: pricing.subtotalAmount,
        totalAmount: pricing.totalAmount,
        reservationExpiresAt,
        items: pricing.items,
        payment: {
          provider: PaymentProvider.MPESA,
          status: PaymentStatus.PENDING,
          amount: pricing.totalAmount,
          currency: pricing.currency,
          idempotencyKey: normalizedKey,
          providerReference: undefined,
          externalRequestId: undefined,
          rawRequest: {
            source: "order-create",
            orderNumberPending: true,
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

  async getOrderByOrderNumber(orderNumber: string) {
    await this.repository.expirePendingOrders(new Date());

    const order = await this.repository.getOrderByOrderNumber(orderNumber);
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    return mapOrderRecord(order);
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
