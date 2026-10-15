import {
  CheckInMethod,
  OrderStatus,
  Prisma,
  TicketStatus,
  type Prisma as PrismaTypes,
  type TicketDeliveryStatus as PrismaTicketDeliveryStatus,
  type TicketEmailDeliveryTrigger,
} from "@prisma/client";
import { randomBytes, randomInt } from "node:crypto";
import { NotFoundError, ValidationError } from "../../common/errors/httpErrors.js";
import { logger } from "../../common/utils/logger.js";
import { env } from "../../config/env.js";
import { TicketEmailService } from "../email/ticketEmail.service.js";
import {
  mapTicketStatus,
  TicketsRepository,
  type IssuanceOrderWithRelations,
  type PublicTicketWithRelations,
  type TicketEmailDeliverySummaryWithAttempts,
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
  SerializedTicketDeliveryStatus,
  PublicTicketDownloadRecord,
  PublicTicketRecord,
  SerializedIssuedTicketRecord,
  TicketEmailDeliverySummaryRecord,
} from "./tickets.types.js";

const ticketEmailDeliveryInFlight = new Set<string>();
const retryBackoffMinutes = [5, 15, 60, 360];

function mapTicketDeliveryStatus(status: PrismaTicketDeliveryStatus): SerializedTicketDeliveryStatus {
  if (status === "SENT") return "sent";
  if (status === "FAILED") return "failed";
  return "pending";
}

function mapTicketEmailDeliveryTrigger(trigger: TicketEmailDeliveryTrigger) {
  if (trigger === "AUTOMATIC") return "automatic" as const;
  if (trigger === "MANUAL") return "manual" as const;
  return "initial" as const;
}

function mapTicketEmailDeliveryAttemptStatus(status: "SENT" | "FAILED" | "SKIPPED") {
  if (status === "SENT") return "sent" as const;
  if (status === "SKIPPED") return "skipped" as const;
  return "failed" as const;
}

function summarizeDeliveryError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim().slice(0, 500) || "Ticket email delivery failed";
}

function getNextRetryAt(attemptNumber: number, now: Date) {
  if (attemptNumber >= env.EMAIL_DELIVERY_RETRY_MAX_ATTEMPTS) {
    return null;
  }

  const backoffIndex = Math.min(attemptNumber - 1, retryBackoffMinutes.length - 1);
  const backoffMinutes = retryBackoffMinutes[backoffIndex] ?? retryBackoffMinutes[retryBackoffMinutes.length - 1];

  return new Date(now.getTime() + backoffMinutes * 60 * 1000);
}

function mapTicketEmailDeliverySummary(order: TicketEmailDeliverySummaryWithAttempts): TicketEmailDeliverySummaryRecord {
  const ticketDeliveryStatus = mapTicketDeliveryStatus(order.ticketDeliveryStatus);
  const hasBuyerEmail = Boolean(order.buyerEmail);
  const hasIssuedTickets = order.tickets.length > 0;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    ticketDeliveryStatus,
    attemptCount: order.ticketDeliveryAttemptCount,
    maxAttempts: env.EMAIL_DELIVERY_RETRY_MAX_ATTEMPTS,
    lastAttemptAt: order.ticketDeliveryLastAttemptAt?.toISOString(),
    nextRetryAt: order.ticketDeliveryNextRetryAt?.toISOString(),
    lastError: order.ticketDeliveryLastError ?? undefined,
    hasBuyerEmail,
    hasIssuedTickets,
    canResend: env.EMAIL_DELIVERY_ENABLED && ticketDeliveryStatus !== "sent" && hasBuyerEmail && hasIssuedTickets,
    attempts: order.ticketEmailDeliveryAttempts.map((attempt) => ({
      id: attempt.id,
      trigger: mapTicketEmailDeliveryTrigger(attempt.trigger),
      status: mapTicketEmailDeliveryAttemptStatus(attempt.status),
      recipient: attempt.recipient ?? undefined,
      attemptNumber: attempt.attemptNumber,
      messageId: attempt.messageId ?? undefined,
      errorSummary: attempt.errorSummary ?? undefined,
      createdAt: attempt.createdAt.toISOString(),
      completedAt: attempt.completedAt?.toISOString(),
    })),
  };
}

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
  constructor(
    private readonly repository: TicketsRepository = new TicketsRepository(),
    private readonly ticketEmailService: TicketEmailService = new TicketEmailService(),
  ) {}

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
      sequenceNumber: number;
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
            sequenceNumber: input.sequenceNumber,
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
    await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${orderId} FOR UPDATE`;
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
      const existingSequences = new Set(
        order.tickets.filter((ticket) => ticket.orderItemId === item.id).map((ticket) => ticket.sequenceNumber),
      );
      for (let index = 1; index <= item.quantity; index += 1) {
        if (existingSequences.has(index)) continue;
        const created = await this.createTicketWithRetries(
          {
            orderId: order.id,
            orderItemId: item.id,
            sequenceNumber: index,
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

    const tickets = await this.repository.withTransaction((innerTx) => this.issueTicketsInTransaction(orderId, innerTx));
    void this.deliverIssuedTicketsForOrder(orderId).catch((error) => {
      logger.error("Background ticket email delivery failed", {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
    return tickets;
  }

  async getTicketEmailDeliverySummary(orderId: string): Promise<TicketEmailDeliverySummaryRecord> {
    const order = await this.repository.getTicketEmailDeliverySummary(orderId);
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    return mapTicketEmailDeliverySummary(order);
  }

  async listDueTicketEmailDeliveryOrderIds(now = new Date()) {
    if (!env.EMAIL_DELIVERY_ENABLED || !env.EMAIL_DELIVERY_RETRY_ENABLED) {
      return [];
    }

    return this.repository.listDueTicketEmailDeliveryOrderIds(
      now,
      env.EMAIL_DELIVERY_RETRY_BATCH_SIZE,
      env.EMAIL_DELIVERY_RETRY_MAX_ATTEMPTS,
    );
  }

  async attemptTicketEmailDelivery(
    orderId: string,
    trigger: TicketEmailDeliveryTrigger,
  ): Promise<TicketEmailDeliverySummaryRecord> {
    if (ticketEmailDeliveryInFlight.has(orderId)) {
      return this.getTicketEmailDeliverySummary(orderId);
    }

    ticketEmailDeliveryInFlight.add(orderId);

    try {
      const order = await this.repository.getOrderForTicketDelivery(orderId);
      if (!order) {
        throw new NotFoundError("Order not found");
      }

      if (order.ticketDeliveryStatus === "SENT" || order.tickets.length === 0) {
        return this.getTicketEmailDeliverySummary(orderId);
      }

      if (trigger === "AUTOMATIC" && order.ticketDeliveryAttemptCount >= env.EMAIL_DELIVERY_RETRY_MAX_ATTEMPTS) {
        return this.getTicketEmailDeliverySummary(orderId);
      }

      if (!env.EMAIL_DELIVERY_ENABLED) {
        if (trigger === "MANUAL") {
          throw new ValidationError("Ticket email delivery is disabled. Set EMAIL_DELIVERY_ENABLED=true and configure SMTP before resending tickets.");
        }

        logger.info("Ticket email delivery skipped because email delivery is disabled", {
          orderId,
          orderNumber: order.orderNumber,
        });
        return this.getTicketEmailDeliverySummary(orderId);
      }

      const attemptNumber = order.ticketDeliveryAttemptCount + 1;

      if (!order.buyerEmail) {
        const completedAt = new Date();
        const errorSummary = "Buyer email is missing; tickets cannot be emailed.";
        const updated = await this.repository.recordTicketEmailDeliveryAttempt({
          orderId,
          trigger,
          status: "SKIPPED",
          ticketDeliveryStatus: "FAILED",
          recipient: null,
          attemptNumber,
          errorSummary,
          completedAt,
          nextRetryAt: null,
        });

        logger.warn("Ticket email delivery failed: buyer email is missing", {
          orderId,
          orderNumber: order.orderNumber,
        });
        return mapTicketEmailDeliverySummary(updated);
      }

      try {
        const delivery = await this.ticketEmailService.sendTicketDeliveryEmail(order);

        if (delivery.status === "sent") {
          const completedAt = new Date();
          const updated = await this.repository.recordTicketEmailDeliveryAttempt({
            orderId,
            trigger,
            status: "SENT",
            ticketDeliveryStatus: "SENT",
            recipient: order.buyerEmail,
            attemptNumber,
            messageId: delivery.messageId,
            completedAt,
            nextRetryAt: null,
          });

          logger.info("Ticket email delivered", {
            orderId,
            orderNumber: order.orderNumber,
            recipient: order.buyerEmail,
            messageId: delivery.messageId,
            trigger: mapTicketEmailDeliveryTrigger(trigger),
          });
          return mapTicketEmailDeliverySummary(updated);
        }

        const errorSummary =
          delivery.reason === "missing_recipient"
            ? "Buyer email is missing; tickets cannot be emailed."
            : "Email delivery is disabled.";
        const completedAt = new Date();
        const updated = await this.repository.recordTicketEmailDeliveryAttempt({
          orderId,
          trigger,
          status: "SKIPPED",
          ticketDeliveryStatus: delivery.reason === "missing_recipient" ? "FAILED" : order.ticketDeliveryStatus,
          recipient: order.buyerEmail,
          attemptNumber,
          errorSummary,
          completedAt,
          nextRetryAt: null,
        });

        logger.info("Ticket email delivery skipped", {
          orderId,
          orderNumber: order.orderNumber,
          reason: delivery.reason,
        });
        return mapTicketEmailDeliverySummary(updated);
      } catch (error) {
        const completedAt = new Date();
        const errorSummary = summarizeDeliveryError(error);
        const nextRetryAt = getNextRetryAt(attemptNumber, completedAt);
        const updated = await this.repository.recordTicketEmailDeliveryAttempt({
          orderId,
          trigger,
          status: "FAILED",
          ticketDeliveryStatus: "FAILED",
          recipient: order.buyerEmail,
          attemptNumber,
          errorSummary,
          completedAt,
          nextRetryAt,
        });

        logger.error("Ticket email delivery failed", {
          orderId,
          orderNumber: order.orderNumber,
          nextRetryAt: nextRetryAt?.toISOString(),
          error: errorSummary,
          trigger: mapTicketEmailDeliveryTrigger(trigger),
        });
        return mapTicketEmailDeliverySummary(updated);
      }
    } finally {
      ticketEmailDeliveryInFlight.delete(orderId);
    }
  }

  async deliverIssuedTicketsForOrder(orderId: string): Promise<SerializedTicketDeliveryStatus> {
    const result = await this.attemptTicketEmailDelivery(orderId, "INITIAL");
    return result.ticketDeliveryStatus;
  }

  async resendTicketEmailDeliveryForOrder(orderId: string): Promise<TicketEmailDeliverySummaryRecord> {
    const summary = await this.getTicketEmailDeliverySummary(orderId);

    if (summary.ticketDeliveryStatus === "sent") {
      throw new ValidationError("Ticket email has already been sent for this order");
    }

    if (!summary.hasIssuedTickets) {
      throw new ValidationError("Tickets have not been issued for this order");
    }

    if (!summary.hasBuyerEmail) {
      throw new ValidationError("Buyer email is missing for this order");
    }

    if (!env.EMAIL_DELIVERY_ENABLED) {
      throw new ValidationError("Ticket email delivery is disabled. Set EMAIL_DELIVERY_ENABLED=true and configure SMTP before resending tickets.");
    }

    return this.attemptTicketEmailDelivery(orderId, "MANUAL");
  }

  async issueTicketsForOrderByAdmin(orderId: string) {
    const result = await this.repository.withTransaction(async (tx) => {
      const tickets = await this.issueTicketsInTransaction(orderId, tx);
      const order = await this.repository.updateOrderTicketDeliveryStatus(orderId, "PENDING", tx);

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        ticketsIssued: tickets.length,
      };
    });

    const ticketDeliveryStatus = await this.deliverIssuedTicketsForOrder(orderId);

    return {
      ...result,
      ticketDeliveryStatus,
    };
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
