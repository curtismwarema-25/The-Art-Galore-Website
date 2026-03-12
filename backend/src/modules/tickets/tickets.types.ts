export type SerializedTicketStatus = "active" | "checked_in" | "revoked" | "cancelled";

export type SerializedIssuedTicketRecord = {
  id: string;
  ticketNumber: string;
  publicTicketToken: string;
  qrCodeValue: string;
  ticketStatus: SerializedTicketStatus;
  issuedAt: string;
  checkedInAt?: string;
};

export type PublicTicketRecord = {
  ticketNumber: string;
  publicTicketToken: string;
  qrCodeValue: string;
  qrCodeDataUrl: string;
  ticketStatus: SerializedTicketStatus;
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

export type PublicTicketDownloadRecord = {
  fileName: string;
  contentType: "application/pdf";
  contentDisposition: string;
  payload: Buffer;
};

export type AdminTicketSearchFilters = {
  query: string;
  eventId?: string;
  ticketStatus?: SerializedTicketStatus;
  limit: number;
};

export type AdminTicketSearchRecord = {
  id: string;
  ticketNumber: string;
  publicTicketToken: string;
  qrCodeValue: string;
  ticketStatus: SerializedTicketStatus;
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
  ticketStatus: SerializedTicketStatus;
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
