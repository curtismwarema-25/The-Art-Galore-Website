import { ApiError, apiRequest } from "@/api/client";
import type { OrderRecord, PaymentStatus } from "@/types/models";

type ApiData<T> = {
  data: T;
  meta?: {
    idempotentReplay?: boolean;
  };
};

export type OrderLifecycleStatus = "pending" | "paid" | "failed" | "expired" | "refunded";
export type OrderPaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type OrderPaymentProvider = "mpesa" | "card" | "bank" | "manual";

export type OrderDetailsRecord = {
  id: string;
  orderNumber: string;
  status: OrderLifecycleStatus;
  currency: string;
  subtotalAmount: number;
  totalAmount: number;
  reservationExpiresAt: string;
  placedAt: string;
  paidAt?: string;
  expiredAt?: string;
  refundedAt?: string;
  event: {
    id: string;
    slug: string;
    title: string;
  };
  buyer: {
    fullName: string;
    phone: string;
    email?: string;
  };
  items: Array<{
    id: string;
    ticketTierId: string;
    ticketTierName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  payment: {
    id: string;
    provider: OrderPaymentProvider;
    status: OrderPaymentStatus;
    amount: number;
    currency: string;
    providerReference?: string;
    resultCode?: string;
    resultMessage?: string;
    initiatedAt: string;
    completedAt?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrderInput = {
  eventId: string;
  buyer: {
    fullName: string;
    phone: string;
    email?: string;
  };
  items: Array<{
    ticketTierId: string;
    quantity: number;
  }>;
};

export type CreateOrderResult = {
  order: OrderDetailsRecord;
  idempotentReplay: boolean;
};

export type AdminOrdersFilters = {
  status?: OrderLifecycleStatus;
  eventId?: string;
  search?: string;
};

function buildAdminOrdersPath(filters?: AdminOrdersFilters) {
  if (!filters) return "/admin/orders";

  const query = new URLSearchParams();

  if (filters.status) query.set("status", filters.status);
  if (filters.eventId) query.set("eventId", filters.eventId);
  if (filters.search) query.set("search", filters.search);

  const queryText = query.toString();
  return queryText ? `/admin/orders?${queryText}` : "/admin/orders";
}

function mapOrderPaymentStatusForLegacy(status: OrderPaymentStatus | undefined): PaymentStatus {
  if (status === "paid") return "paid";
  if (status === "failed") return "failed";
  if (status === "refunded") return "refunded";
  return "pending";
}

function mapOrderToLegacyRecord(order: OrderDetailsRecord): OrderRecord {
  const firstItem = order.items[0];
  const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: order.id,
    slug: order.orderNumber,
    displayOrder: 0,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    status: order.status,
    eventId: order.event.id,
    buyerId: order.buyer.phone,
    tierId: firstItem?.ticketTierId ?? "unknown-tier",
    quantity,
    amount: order.totalAmount,
    currency: order.currency as "KES",
    paymentReference: order.payment?.providerReference ?? order.orderNumber,
    paymentStatus: mapOrderPaymentStatusForLegacy(order.payment?.status),
    ticketDeliveryStatus: "pending",
    checkedInStatus: "not-checked-in",
    payment: {
      provider: order.payment?.provider ?? "manual",
      providerReference: order.payment?.providerReference,
      resultCode: order.payment?.resultCode,
      resultMessage: order.payment?.resultMessage,
      initiatedAt: order.payment?.initiatedAt,
      paidAt: order.paidAt,
    },
  };
}

export async function createOrder(input: CreateOrderInput, idempotencyKey?: string): Promise<CreateOrderResult> {
  const headers: HeadersInit | undefined = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;

  const response = await apiRequest<ApiData<OrderDetailsRecord>>("/orders", {
    method: "POST",
    headers,
    body: input,
  });

  return {
    order: response.data,
    idempotentReplay: response.meta?.idempotentReplay ?? false,
  };
}

export async function getOrderByNumber(orderNumber: string) {
  try {
    const response = await apiRequest<ApiData<OrderDetailsRecord>>(`/orders/${orderNumber}`, {
      method: "GET",
    });
    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function getAdminOrders(filters?: AdminOrdersFilters) {
  const response = await apiRequest<ApiData<OrderDetailsRecord[]>>(buildAdminOrdersPath(filters), {
    method: "GET",
  });

  return response.data;
}

export async function getAdminOrderById(id: string) {
  try {
    const response = await apiRequest<ApiData<OrderDetailsRecord>>(`/admin/orders/${id}`, {
      method: "GET",
    });

    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

// Legacy compatibility for still-unmigrated admin check-in scaffold.
export async function getOrders() {
  const orders = await getAdminOrders();
  return orders.map(mapOrderToLegacyRecord);
}

// Legacy compatibility for still-unmigrated admin check-in scaffold.
export async function getOrderById(id: string) {
  const order = await getAdminOrderById(id);
  return order ? mapOrderToLegacyRecord(order) : null;
}

export async function updateOrder(_id: string, _input: Partial<OrderRecord>) {
  throw new Error("Order update endpoint is not implemented in this pass.");
}

export async function cancelOrder(_id: string) {
  throw new Error("Order cancellation endpoint is not implemented in this pass.");
}
