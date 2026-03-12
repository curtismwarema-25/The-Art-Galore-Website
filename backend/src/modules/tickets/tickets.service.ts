import { CheckInMethod, OrderStatus, Prisma, TicketStatus, type Prisma as PrismaTypes } from "@prisma/client";
import { randomBytes, randomInt } from "node:crypto";
import { NotFoundError, ValidationError } from "../../common/errors/httpErrors.js";
import { env } from "../../config/env.js";
import {
  mapTicketStatus,
  TicketsRepository,
  type IssuanceOrderWithRelations,
  type PublicTicketWithRelations,
} from "./tickets.repository.js";
import { renderTicketPdf } from "./ticketPdf.js";
import {
  buildTicketQrPayload,
  generateQrCodeDataUrl,
  normalizeTicketLookupInput,
  qrDataUrlToBuffer,
} from "./ticketQr.js";
import type {
  AdminTicketCheckInInput,
  AdminTicketCheckInResult,
  AdminTicketVerificationResult,
  AdminTicketSearchFilters,
  AdminTicketSearchRecord,
  PublicTicketDownloadRecord,
  PublicTicketRecord,
  SerializedIssuedTicketRecord,
} from "./tickets.types.js";

function mapTicketRecord(ticket: PublicTicketWithRelations): SerializedIssuedTicketRecord {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    publicTicketToken: ticket.publicTicketToken,
    qrCodeValue: ticket.qrCodeValue,
    ticketStatus: mapTicketStatus(ticket.status),
    issuedAt: ticket.issuedAt.toISOString(),
    checkedInAt: ticket.checkIns[0]?.checkedInAt?.toISOString(),
  };
}

function mapPublicTicketRecord(ticket: PublicTicketWithRelations, qrCodeDataUrl: string): PublicTicketRecord {
  return {
    ticketNumber: ticket.ticketNumber,
    publicTicketToken: ticket.publicTicketToken,
    qrCodeValue: ticket.qrCodeValue,
    qrCodeDataUrl,
    ticketStatus: mapTicketStatus(ticket.status),
    issuedAt: ticket.issuedAt.toISOString(),
    checkedInAt: ticket.checkIns[0]?.checkedInAt?.toISOString(),
    downloadUrl: `${env.API_PREFIX}/tickets/${ticket.publicTicketToken}/download`,
    attendeeName: ticket.order.buyerName,
    order: {
      orderNumber: ticket.order.orderNumber,
    },
    event: {
      slug: ticket.event.slug,
      title: ticket.event.title,
      startAt: ticket.event.startAt.toISOString(),
      endAt: ticket.event.endAt.toISOString(),
      venueName: ticket.event.venueName,
    },
    ticketTier: {
      name: ticket.ticketTier.name,
    },
  };
}

function mapAdminTicketRecord(ticket: PublicTicketWithRelations): AdminTicketSearchRecord {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    publicTicketToken: ticket.publicTicketToken,
    qrCodeValue: ticket.qrCodeValue,
    ticketStatus: mapTicketStatus(ticket.status),
    issuedAt: ticket.issuedAt.toISOString(),
    checkedInAt: ticket.checkIns[0]?.checkedInAt?.toISOString(),
    orderNumber: ticket.order.orderNumber,
    buyerName: ticket.order.buyerName,
    buyerPhone: ticket.order.buyerPhone,
    eventTitle: ticket.event.title,
    eventSlug: ticket.event.slug,
    ticketTierName: ticket.ticketTier.name,
  };
}

export class TicketsService {
  constructor(private readonly repository: TicketsRepository = new TicketsRepository()) {}

  private createTicketNumber(now: Date) {
    const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    return `TKT-${stamp}-${randomInt(100000, 999999)}`;
  }

  private createPublicTicketToken() {
    return randomBytes(32).toString("base64url");
  }

  private createQrCodeValue(publicTicketToken: string) {
    return buildTicketQrPayload(publicTicketToken);
  }

  private getTicketLookupCandidates(rawInput: string) {
    const trimmed = rawInput.trim();
    const normalized = normalizeTicketLookupInput(trimmed);
    const candidates = [normalized, trimmed];

    if (normalized && !normalized.startsWith("agi-ticket:")) {
      candidates.push(buildTicketQrPayload(normalized));
    }

    return [...new Set(candidates.filter(Boolean))];
  }

  private async createTicketWithRetries(
    input: {
      orderId: string;
      orderItemId: string;
      eventId: string;
      ticketTierId: string;
      buyerId: string;
      issuedAt: Date;
    },
    tx: PrismaTypes.TransactionClient,
  ) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const publicTicketToken = this.createPublicTicketToken();

      try {
        return await this.repository.createTicket(
          {
            ticketNumber: this.createTicketNumber(input.issuedAt),
            publicTicketToken,
            qrCodeValue: this.createQrCodeValue(publicTicketToken),
            orderId: input.orderId,
            orderItemId: input.orderItemId,
            eventId: input.eventId,
            ticketTierId: input.ticketTierId,
            buyerId: input.buyerId,
            issuedAt: input.issuedAt,
          },
          tx,
        );
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          continue;
        }

        throw error;
      }
    }

    throw new ValidationError("Unable to generate unique ticket identifiers");
  }

  private assertOrderCanIssueTickets(order: IssuanceOrderWithRelations) {
    const expectedTickets = order.items.reduce((sum, item) => sum + item.quantity, 0);

    if (expectedTickets <= 0) {
      throw new ValidationError("Order does not contain ticket items");
    }

    if (order.status !== OrderStatus.PAYMENT_VERIFIED && order.status !== OrderStatus.PAID) {
      throw new ValidationError("Tickets can only be issued after payment verification");
    }

    if (order.tickets.length > 0 && order.tickets.length !== expectedTickets) {
      throw new ValidationError("Ticket issuance is in an inconsistent state");
    }
  }

  private async issueTicketsInTransaction(orderId: string, tx: PrismaTypes.TransactionClient) {
    const order = await this.repository.getOrderForTicketIssuance(orderId, tx);
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    this.assertOrderCanIssueTickets(order);
    const expectedTickets = order.items.reduce((sum, item) => sum + item.quantity, 0);

    if (order.tickets.length === expectedTickets) {
      return order.tickets.map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        publicTicketToken: ticket.publicTicketToken,
        qrCodeValue: ticket.qrCodeValue,
        ticketStatus: mapTicketStatus(ticket.status),
        issuedAt: ticket.issuedAt.toISOString(),
        checkedInAt: ticket.checkIns[0]?.checkedInAt?.toISOString(),
      }));
    }

    const issuedAt = new Date();
    const createdTickets: PublicTicketWithRelations[] = [];

    for (const item of order.items) {
      for (let index = 0; index < item.quantity; index += 1) {
        const created = await this.createTicketWithRetries(
          {
            orderId: order.id,
            orderItemId: item.id,
            eventId: order.eventId,
            ticketTierId: item.ticketTierId,
            buyerId: order.buyerId,
            issuedAt,
          },
          tx,
        );
        createdTickets.push(created);
      }
    }

    return createdTickets.map(mapTicketRecord);
  }

  async issueTicketsForOrder(orderId: string, tx?: PrismaTypes.TransactionClient): Promise<SerializedIssuedTicketRecord[]> {
    if (tx) {
      return this.issueTicketsInTransaction(orderId, tx);
    }

    return this.repository.withTransaction((innerTx) => this.issueTicketsInTransaction(orderId, innerTx));
  }

  async issueTicketsForOrderByAdmin(orderId: string) {
    return this.repository.withTransaction(async (tx) => {
      const tickets = await this.issueTicketsInTransaction(orderId, tx);
      const order = await this.repository.updateOrderTicketDeliverySent(orderId, tx);

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        ticketsIssued: tickets.length,
      };
    });
  }

  async getPublicTicketByToken(publicTicketToken: string): Promise<PublicTicketRecord> {
    const ticket = await this.repository.getTicketByPublicToken(publicTicketToken);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    const qrCodeDataUrl = await generateQrCodeDataUrl(ticket.qrCodeValue, 360);
    return mapPublicTicketRecord(ticket, qrCodeDataUrl);
  }

  async getPublicTicketDownloadByToken(publicTicketToken: string): Promise<PublicTicketDownloadRecord> {
    const ticket = await this.repository.getTicketByPublicToken(publicTicketToken);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    const qrCodeDataUrl = await generateQrCodeDataUrl(ticket.qrCodeValue, 520);
    const qrImageBuffer = qrDataUrlToBuffer(qrCodeDataUrl);
    const payload = await renderTicketPdf({
      brandName: "Art Galore International",
      ticket,
      qrImageBuffer,
    });

    const safeTicketNumber = ticket.ticketNumber.replace(/[^a-zA-Z0-9-_]/g, "_");
    const fileName = `${safeTicketNumber}.pdf`;

    return {
      fileName,
      contentType: "application/pdf",
      contentDisposition: `attachment; filename="${fileName}"`,
      payload,
    };
  }

  async searchAdminTickets(filters: AdminTicketSearchFilters): Promise<AdminTicketSearchRecord[]> {
    const normalizedQuery = normalizeTicketLookupInput(filters.query);
    const effectiveQuery = (normalizedQuery.length >= 2 ? normalizedQuery : filters.query).trim();
    const tickets = await this.repository.listAdminTickets({
      ...filters,
      query: effectiveQuery,
    });
    return tickets.map(mapAdminTicketRecord);
  }

  async verifyAdminTicket(publicTicketToken: string): Promise<AdminTicketVerificationResult> {
    const ticket = await this.repository.getTicketByPublicToken(publicTicketToken);

    if (!ticket) {
      return {
        valid: false,
        reason: "not_found",
      };
    }

    const mappedTicket = mapAdminTicketRecord(ticket);
    const status = mapTicketStatus(ticket.status);

    if (status === "active") {
      return {
        valid: true,
        reason: "active",
        ticket: mappedTicket,
      };
    }

    if (status === "checked_in") {
      return {
        valid: false,
        reason: "already_checked_in",
        ticket: mappedTicket,
      };
    }

    if (status === "revoked") {
      return {
        valid: false,
        reason: "revoked",
        ticket: mappedTicket,
      };
    }

    return {
      valid: false,
      reason: "cancelled",
      ticket: mappedTicket,
    };
  }

  async checkInTicket(input: AdminTicketCheckInInput, checkedInByUserId: string): Promise<AdminTicketCheckInResult> {
    const lookupCandidates = this.getTicketLookupCandidates(input.query);
    const now = new Date();

    const checkedInTicket = await this.repository.withTransaction(async (tx) => {
      let ticket: PublicTicketWithRelations | null = null;

      for (const candidate of lookupCandidates) {
        ticket = await this.repository.findTicketByLookup(candidate, tx);
        if (ticket) break;
      }

      if (!ticket) {
        throw new NotFoundError("Ticket not found");
      }

      if (ticket.status === TicketStatus.CHECKED_IN) {
        throw new ValidationError("Ticket has already been checked in");
      }

      if (ticket.status !== TicketStatus.ACTIVE) {
        throw new ValidationError("Ticket is not active for check-in");
      }

      const updated = await this.repository.applyTicketCheckIn(
        {
          ticketId: ticket.id,
          checkedInByUserId,
          method: input.method === "qr" ? CheckInMethod.QR : CheckInMethod.MANUAL,
          checkpointLabel: input.checkpointLabel,
          notes: input.notes,
          checkedInAt: now,
        },
        tx,
      );

      if (!updated) {
        throw new ValidationError("Ticket is no longer active for check-in");
      }

      return updated;
    });

    return {
      ticketNumber: checkedInTicket.ticketNumber,
      publicTicketToken: checkedInTicket.publicTicketToken,
      ticketStatus: mapTicketStatus(checkedInTicket.status),
      checkedInAt: checkedInTicket.checkIns[0]?.checkedInAt?.toISOString() ?? now.toISOString(),
      eventTitle: checkedInTicket.event.title,
      buyerName: checkedInTicket.order.buyerName,
      ticketTierName: checkedInTicket.ticketTier.name,
    };
  }
}
