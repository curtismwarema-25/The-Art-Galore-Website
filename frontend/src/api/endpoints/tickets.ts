import { ApiError, apiRequest } from "@/api/client";
import { apiUrl } from "@/config/env";
import type { CheckInStatus, TicketDeliveryStatus, TicketRecord } from "@/types/models";

type ApiData<T> = {
  data: T;
};

export type PublicTicketRecord = {
  ticketNumber: string;
  publicTicketToken: string;
  qrCodeValue: string;
  qrCodeDataUrl: string;
  ticketStatus: "active" | "checked_in" | "revoked" | "cancelled";
  issuedAt: string;
  checkedInAt?: string;
  downloadUrl: string;
  attendeeName: string;
  order: {
    orderNumber: string;
  };
  event: {
    slug: string;
    title: string;
    startAt: string;
    endAt: string;
    venueName: string;
  };
  ticketTier: {
    name: string;
  };
};

export type AdminTicketSearchRecord = {
  id: string;
  ticketNumber: string;
  publicTicketToken: string;
  qrCodeValue: string;
  ticketStatus: "active" | "checked_in" | "revoked" | "cancelled";
  issuedAt: string;
  checkedInAt?: string;
  orderNumber: string;
  buyerName: string;
  buyerPhone: string;
  eventTitle: string;
  eventSlug: string;
  ticketTierName: string;
};

export type AdminTicketCheckInInput = {
  query: string;
  method: "qr" | "manual";
  checkpointLabel?: string;
  notes?: string;
};

export type AdminTicketCheckInResult = {
  ticketNumber: string;
  publicTicketToken: string;
  ticketStatus: "active" | "checked_in" | "revoked" | "cancelled";
  checkedInAt: string;
  eventTitle: string;
  buyerName: string;
  ticketTierName: string;
};

export type AdminTicketVerificationResult = {
  valid: boolean;
  reason: "active" | "already_checked_in" | "revoked" | "cancelled" | "not_found";
  ticket?: AdminTicketSearchRecord;
};

export type AdminIssueOrderTicketsResult = {
  orderId: string;
  orderNumber: string;
  ticketsIssued: number;
  ticketDeliveryStatus: TicketDeliveryStatus;
};

export type TicketEmailDeliveryAttemptRecord = {
  id: string;
  trigger: "initial" | "automatic" | "manual";
  status: "sent" | "failed" | "skipped";
  recipient?: string;
  attemptNumber: number;
  messageId?: string;
  errorSummary?: string;
  createdAt: string;
  completedAt?: string;
};

export type TicketEmailDeliverySummaryRecord = {
  orderId: string;
  orderNumber: string;
  ticketDeliveryStatus: TicketDeliveryStatus;
  attemptCount: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  lastError?: string;
  hasBuyerEmail: boolean;
  hasIssuedTickets: boolean;
  canResend: boolean;
  attempts: TicketEmailDeliveryAttemptRecord[];
};

export type AdminTicketSearchFilters = {
  query: string;
  eventId?: string;
  ticketStatus?: "active" | "checked_in" | "revoked" | "cancelled";
  limit?: number;
};

function buildTicketSearchPath(filters: AdminTicketSearchFilters) {
  const query = new URLSearchParams();
  query.set("query", filters.query);
  if (filters.eventId) query.set("eventId", filters.eventId);
  if (filters.ticketStatus) query.set("ticketStatus", filters.ticketStatus);
  if (filters.limit) query.set("limit", String(filters.limit));

  return `/admin/tickets/search?${query.toString()}`;
}

export async function getTicketById(publicTicketToken: string) {
  try {
    const response = await apiRequest<ApiData<PublicTicketRecord>>(`/tickets/${publicTicketToken}`, {
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

export async function searchTickets(filters: AdminTicketSearchFilters) {
  const response = await apiRequest<ApiData<AdminTicketSearchRecord[]>>(buildTicketSearchPath(filters), {
    method: "GET",
  });
  return response.data;
}

export async function verifyTicketByToken(publicTicketToken: string) {
  const response = await apiRequest<ApiData<AdminTicketVerificationResult>>(`/admin/tickets/verify/${publicTicketToken}`, {
    method: "GET",
  });
  return response.data;
}

export async function checkInTicket(input: AdminTicketCheckInInput) {
  const response = await apiRequest<ApiData<AdminTicketCheckInResult>>("/admin/tickets/check-in", {
    method: "POST",
    body: input,
  });
  return response.data;
}

export async function issueTicketsForOrder(orderId: string) {
  const response = await apiRequest<ApiData<AdminIssueOrderTicketsResult>>(`/admin/tickets/issue/order/${orderId}`, {
    method: "POST",
  });
  return response.data;
}

export async function getTicketEmailDeliverySummary(orderId: string) {
  const response = await apiRequest<ApiData<TicketEmailDeliverySummaryRecord>>(`/admin/tickets/delivery/order/${orderId}`, {
    method: "GET",
  });
  return response.data;
}

export async function resendTicketEmailDelivery(orderId: string) {
  const response = await apiRequest<ApiData<TicketEmailDeliverySummaryRecord>>(`/admin/tickets/delivery/order/${orderId}/resend`, {
    method: "POST",
  });
  return response.data;
}

export function getTicketDownloadUrl(publicTicketToken: string) {
  return apiUrl(`/tickets/${publicTicketToken}/download`);
}

// Legacy helper retained for compatibility with older hooks.
export async function getTickets() {
  throw new Error("Ticket list endpoint is not available. Use admin ticket search instead.");
}

// Legacy helper retained for compatibility with older hooks.
export async function updateTicketCheckIn(ticketId: string, status: CheckInStatus) {
  if (status !== "checked-in") {
    throw new Error("Undo check-in is not supported in this pass.");
  }

  return checkInTicket({ query: ticketId, method: "manual" });
}

export async function issueTicket(input: Partial<TicketRecord>) {
  if (!input.orderId) {
    throw new Error("orderId is required to issue tickets.");
  }

  const result = await issueTicketsForOrder(input.orderId);
  return {
    id: result.orderId,
    slug: result.orderNumber,
    displayOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "published",
    orderId: input.orderId,
    eventId: input.eventId ?? "",
    buyerId: input.buyerId ?? "",
    qrCodeValue: "",
    quantity: 1,
    tierId: input.tierId ?? "",
    paymentStatus: "paid",
    checkedInStatus: "not-checked-in",
    checkIn: {},
  } as TicketRecord;
}
