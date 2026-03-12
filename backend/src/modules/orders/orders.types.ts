export type OrderLifecycleStatus =
  | "pending_payment"
  | "payment_submitted"
  | "payment_verified"
  | "payment_rejected"
  | "paid"
  | "expired";

export type VerificationStatus = "not_submitted" | "pending_review" | "approved" | "rejected";

export type PaymentLifecycleStatus = "pending" | "paid" | "failed";

export type PaymentProviderCode = "mpesa" | "card" | "bank" | "manual";

export type SerializedOrderBuyer = {
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
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

export type SerializedOrderPaymentProof = {
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

export type SerializedIssuedTicket = {
  ticketNumber: string;
  publicTicketToken: string;
  qrCodeValue: string;
  ticketStatus: "active" | "checked_in" | "revoked" | "cancelled";
  issuedAt: string;
  checkedInAt?: string;
};

export type SerializedOrderRecord = {
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
  buyer: SerializedOrderBuyer;
  items: SerializedOrderItem[];
  payment: SerializedOrderPayment | null;
  latestPaymentProof: SerializedOrderPaymentProof | null;
  tickets: SerializedIssuedTicket[];
  createdAt: string;
  updatedAt: string;
};

export type PublicTrackedOrderRecord = {
  orderNumber: string;
  status: OrderLifecycleStatus;
  paymentStatus: PaymentLifecycleStatus;
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
  tickets: Array<{
    ticketNumber: string;
    publicTicketToken: string;
    ticketStatus: "active" | "checked_in" | "revoked" | "cancelled";
    issuedAt: string;
  }>;
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
