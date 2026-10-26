import { ApiError, apiRequest } from "@/api/client";
import type { OrderRecord, PaymentStatus } from "@/types/models";

type ApiData<T> = {
  data: T;
  meta?: {
    idempotentReplay?: boolean;
  };
};

export type OrderLifecycleStatus =
  | "pending_payment"
  | "payment_submitted"
  | "payment_verified"
  | "payment_rejected"
  | "paid"
  | "expired";
export type VerificationStatus = "not_submitted" | "pending_review" | "approved" | "rejected";
export type OrderPaymentStatus = "pending" | "paid" | "failed";
export type OrderPaymentProvider = "mpesa" | "card" | "bank" | "manual";
export type TicketDeliveryStatus = "pending" | "sent" | "failed";

export type OrderPaymentProof = {
  id: string;
  paymentMethod: "bank" | "mpesa" | "manual";
  payerName: string;
  phoneNumber: string;
  amountPaid: number;
  transactionReference: string;
  screenshotUrl?: string;
  notes?: string;
  verificationStatus: VerificationStatus;
  verificationNote?: string;
  submittedAt: string;
  reviewedAt?: string;
};

export type IssuedOrderTicket = {
  ticketNumber: string;
  publicTicketToken: string;
  qrCodeValue: string;
  ticketStatus: "active" | "checked_in" | "revoked" | "cancelled";
  issuedAt: string;
  checkedInAt?: string;
};

export type OrderDetailsRecord = {
  id: string;
  orderNumber: string;
  publicToken: string;
  status: OrderLifecycleStatus;
  verificationStatus: VerificationStatus;
  currency: string;
  subtotalAmount: number;
  totalAmount: number;
  reservationExpiresAt: string;
  verificationSubmittedAt?: string;
  placedAt: string;
  paidAt?: string;
  expiredAt?: string;
  event: {
    id: string;
    slug: string;
    title: string;
    startAt: string;
    endAt: string;
    venueName: string;
  };
  buyer: {
    buyerName: string;
    buyerPhone: string;
    buyerEmail: string;
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
  latestPaymentProof: OrderPaymentProof | null;
  ticketDeliveryStatus: TicketDeliveryStatus;
  tickets: IssuedOrderTicket[];
  createdAt: string;
  updatedAt: string;
};

export type PublicTrackedOrderRecord = {
  orderNumber: string;
  status: OrderLifecycleStatus;
  paymentStatus: OrderPaymentStatus;
  paymentResultCode?: string;
  verificationStatus: VerificationStatus;
  currency: string;
  amountDue: number;
  reservationExpiresAt: string;
  verificationSubmittedAt?: string;
  event: {
    slug: string;
    title: string;
    startAt: string;
    endAt: string;
    venueName: string;
  };
  ticketQuantities: Array<{
    tierName: string;
    quantity: number;
  }>;
  canSubmitPaymentProof: boolean;
  mpesaPaymentPending: boolean;
  ticketDeliveryStatus: TicketDeliveryStatus;
  ticketEmailDeliveryEnabled: boolean;
  tickets: Array<{
    ticketNumber: string;
    publicTicketToken: string;
    ticketStatus: "active" | "checked_in" | "revoked" | "cancelled";
    issuedAt: string;
  }>;
};

export type CreateOrderInput = {
  eventId: string;
  buyer: {
    buyerName: string;
    buyerPhone: string;
    buyerEmail?: string;
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
    buyerId: order.buyer.buyerPhone,
    tierId: firstItem?.ticketTierId ?? "unknown-tier",
    quantity,
    amount: order.totalAmount,
    currency: order.currency as "KES",
    paymentReference: order.payment?.providerReference ?? order.orderNumber,
    paymentStatus: mapOrderPaymentStatusForLegacy(order.payment?.status),
    ticketDeliveryStatus: order.ticketDeliveryStatus,
    checkedInStatus: order.tickets.some((ticket) => ticket.ticketStatus === "checked_in") ? "checked-in" : "not-checked-in",
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

export async function trackOrder(publicToken: string) {
  try {
    const response = await apiRequest<ApiData<PublicTrackedOrderRecord>>(`/orders/track/${publicToken}`, {
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

export async function getOrders() {
  const orders = await getAdminOrders();
  return orders.map(mapOrderToLegacyRecord);
}

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
