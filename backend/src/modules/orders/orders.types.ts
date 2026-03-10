export type OrderLifecycleStatus = "pending" | "paid" | "failed" | "expired" | "refunded";

export type PaymentLifecycleStatus = "pending" | "paid" | "failed" | "refunded";

export type PaymentProviderCode = "mpesa" | "card" | "bank" | "manual";

export type SerializedOrderBuyer = {
  fullName: string;
  phone: string;
  email?: string;
};

export type SerializedOrderItem = {
  id: string;
  ticketTierId: string;
  ticketTierName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type SerializedOrderPayment = {
  id: string;
  provider: PaymentProviderCode;
  status: PaymentLifecycleStatus;
  amount: number;
  currency: string;
  providerReference?: string;
  resultCode?: string;
  resultMessage?: string;
  initiatedAt: string;
  completedAt?: string;
};

export type SerializedOrderRecord = {
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
  buyer: SerializedOrderBuyer;
  items: SerializedOrderItem[];
  payment: SerializedOrderPayment | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrderInput = {
  eventId: string;
  buyer: SerializedOrderBuyer;
  items: Array<{
    ticketTierId: string;
    quantity: number;
  }>;
};

export type AdminOrdersListFilters = {
  status?: OrderLifecycleStatus;
  eventId?: string;
  search?: string;
};

export type CreateOrderResult = {
  order: SerializedOrderRecord;
  idempotentReplay: boolean;
};
