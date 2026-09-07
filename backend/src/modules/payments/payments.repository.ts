import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  PaymentVerificationStatus,
  Prisma,
  type PrismaClient,
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { AdminManualPaymentQueueFilters, ManualPaymentMethod, MpesaTransactionAuditFilters } from "./payments.types.js";

type DbClient = PrismaClient | Prisma.TransactionClient;

function getClient(tx?: Prisma.TransactionClient): DbClient {
  return tx ?? prisma;
}

export class PaymentsRepository {
  async withTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction((tx) => callback(tx));
  }

  async findOrderByPublicToken(publicToken: string, tx?: Prisma.TransactionClient) {
    const client = getClient(tx);
    return client.order.findUnique({
      where: { publicToken },
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
        items: {
          include: {
            ticketTier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        paymentProofSubmissions: {
          orderBy: [{ submittedAt: "desc" }],
          take: 1,
        },
        paymentTransactions: {
          orderBy: [{ createdAt: "desc" }],
          take: 5,
        },
        tickets: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  async createPaymentProofSubmission(
    input: {
      orderId: string;
      paymentMethod: PaymentProvider;
      payerName: string;
      phoneNumber: string;
      amountPaid: number;
      transactionReference: string;
      screenshotUrl?: string;
      screenshotStorageKey?: string;
      screenshotMimeType?: string;
      screenshotSizeBytes?: number;
      notes?: string;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.paymentProofSubmission.create({
      data: {
        orderId: input.orderId,
        paymentMethod: input.paymentMethod,
        payerName: input.payerName,
        phoneNumber: input.phoneNumber,
        amountPaid: input.amountPaid,
        transactionReference: input.transactionReference,
        screenshotUrl: input.screenshotUrl,
        screenshotStorageKey: input.screenshotStorageKey,
        screenshotMimeType: input.screenshotMimeType,
        screenshotSizeBytes: input.screenshotSizeBytes,
        notes: input.notes,
        verificationStatus: PaymentVerificationStatus.PENDING,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
    });
  }

  async createManualPaymentTransaction(
    input: {
      orderId: string;
      provider: PaymentProvider;
      amount: number;
      currency: string;
      providerReference: string;
      rawRequest?: Prisma.InputJsonValue;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.paymentTransaction.create({
      data: {
        orderId: input.orderId,
        provider: input.provider,
        status: PaymentStatus.PENDING,
        amount: input.amount,
        currency: input.currency,
        providerReference: input.providerReference,
        rawRequest: input.rawRequest,
      },
    });
  }

  async createMpesaStkTransaction(
    input: {
      orderId: string;
      amount: number;
      currency: string;
      idempotencyKey?: string;
      externalRequestId: string;
      providerReference: string;
      merchantRequestId: string;
      providerAccountKey: string;
      payerPhone: string;
      rawRequest?: Prisma.InputJsonValue;
      rawResponse?: Prisma.InputJsonValue;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.paymentTransaction.create({
      data: {
        orderId: input.orderId,
        provider: PaymentProvider.MPESA,
        status: PaymentStatus.INITIATED,
        amount: input.amount,
        currency: input.currency,
        payerPhone: input.payerPhone,
        idempotencyKey: input.idempotencyKey,
        externalRequestId: input.externalRequestId,
        providerReference: input.providerReference,
        merchantRequestId: input.merchantRequestId,
        providerAccountKey: input.providerAccountKey,
        rawRequest: input.rawRequest,
        rawResponse: input.rawResponse,
      },
    });
  }

  async findPaymentTransactionByExternalRequestId(externalRequestId: string, tx?: Prisma.TransactionClient) {
    const client = getClient(tx);
    return client.paymentTransaction.findFirst({
      where: { provider: PaymentProvider.MPESA, externalRequestId },
      include: {
        order: true,
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async findPaymentTransactionByIdForUpdate(id: string, tx: Prisma.TransactionClient) {
    return tx.paymentTransaction.findUnique({ where: { id }, include: { order: true } });
  }

  async createCallbackInboxEvent(input: {
    provider: PaymentProvider;
    providerAccountKey?: string;
    eventKey: string;
    payloadHash: string;
    checkoutRequestId?: string;
    merchantRequestId?: string;
    providerReceipt?: string;
    resultCode?: string;
    resultDescription?: string;
    payload: Prisma.InputJsonValue;
    correlationId: string;
  }) {
    try {
      return await prisma.paymentCallbackInbox.create({
        data: {
          provider: input.provider,
          providerAccountKey: input.providerAccountKey,
          eventKey: input.eventKey,
          payloadHash: input.payloadHash,
          checkoutRequestId: input.checkoutRequestId,
          merchantRequestId: input.merchantRequestId,
          providerReceipt: input.providerReceipt,
          resultCode: input.resultCode,
          resultDescription: input.resultDescription,
          payload: input.payload,
          correlationId: input.correlationId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return prisma.paymentCallbackInbox.findUnique({ where: { eventKey: input.eventKey } });
      }
      throw error;
    }
  }

  async getCallbackInboxEvent(id: string) {
    return prisma.paymentCallbackInbox.findUnique({ where: { id } });
  }

  async claimNextCallbackInboxEvent(workerId: string, now: Date, leaseUntil: Date) {
    const candidate = await prisma.paymentCallbackInbox.findFirst({
      where: {
        status: { in: ["RECEIVED", "PROCESSING", "RETRYABLE_FAILED"] },
        nextAttemptAt: { lte: now },
        OR: [{ lockedAt: null }, { lockedAt: { lt: now } }],
      },
      orderBy: [{ nextAttemptAt: "asc" }, { receivedAt: "asc" }],
    });
    if (!candidate) return null;

    const claimed = await prisma.paymentCallbackInbox.updateMany({
      where: {
        id: candidate.id,
        status: { in: ["RECEIVED", "PROCESSING", "RETRYABLE_FAILED"] },
        OR: [{ lockedAt: null }, { lockedAt: { lt: now } }],
      },
      data: { status: "PROCESSING", lockedAt: leaseUntil, lockedBy: workerId, processingStartedAt: now },
    });
    return claimed.count === 1 ? this.getCallbackInboxEvent(candidate.id) : null;
  }

  async completeCallbackInboxEvent(id: string, paymentTransactionId?: string) {
    return prisma.paymentCallbackInbox.update({
      where: { id },
      data: { status: "PROCESSED", processedAt: new Date(), lockedAt: null, lockedBy: null, paymentTransactionId },
    });
  }

  async failCallbackInboxEvent(id: string, input: { nextAttemptAt: Date; error: string; manualReview: boolean }) {
    return prisma.paymentCallbackInbox.update({
      where: { id },
      data: {
        status: input.manualReview ? "MANUAL_REVIEW" : "RETRYABLE_FAILED",
        attemptCount: { increment: 1 },
        nextAttemptAt: input.nextAttemptAt,
        lastError: input.error.slice(0, 500),
        failedAt: new Date(),
        requiresManualReview: input.manualReview,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async listDueMpesaTransactionIds(now: Date, limit = 20) {
    const rows = await prisma.paymentTransaction.findMany({
      where: {
        provider: PaymentProvider.MPESA,
        status: { in: [PaymentStatus.INITIATED, PaymentStatus.PENDING, PaymentStatus.AMBIGUOUS] },
        OR: [{ nextReconciliationAt: null }, { nextReconciliationAt: { lte: now } }],
      },
      orderBy: [{ nextReconciliationAt: "asc" }, { updatedAt: "asc" }],
      take: limit,
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async claimMpesaTransaction(id: string, workerId: string, now: Date, leaseUntil: Date) {
    const claimed = await prisma.paymentTransaction.updateMany({
      where: {
        id,
        provider: PaymentProvider.MPESA,
        status: { in: [PaymentStatus.INITIATED, PaymentStatus.PENDING, PaymentStatus.AMBIGUOUS] },
        OR: [{ reconciliationLockedAt: null }, { reconciliationLockedAt: { lt: now } }],
      },
      data: { reconciliationLockedAt: leaseUntil, reconciliationLockedBy: workerId },
    });
    if (claimed.count !== 1) return null;
    return prisma.paymentTransaction.findUnique({ where: { id }, include: { order: true } });
  }

  async recordReconciliationFailure(id: string, input: { nextAttemptAt: Date; error: string; manualReview: boolean }) {
    return prisma.paymentTransaction.updateMany({
      where: { id },
      data: {
        status: input.manualReview ? PaymentStatus.AMBIGUOUS : PaymentStatus.AMBIGUOUS,
        reconciliationAttemptCount: { increment: 1 },
        nextReconciliationAt: input.nextAttemptAt,
        lastReconciliationError: input.error.slice(0, 500),
        reconciliationLockedAt: null,
        reconciliationLockedBy: null,
      },
    });
  }

  async releaseReconciliationLease(id: string) {
    return prisma.paymentTransaction.updateMany({ where: { id }, data: { reconciliationLockedAt: null, reconciliationLockedBy: null } });
  }

  async markOrderPaidAfterFulfillment(orderId: string, now: Date) {
    return prisma.order.updateMany({
      where: { id: orderId, status: OrderStatus.PAYMENT_VERIFIED },
      data: {
        status: OrderStatus.PAID,
        paidAt: now,
        ticketFulfillmentStatus: "COMPLETE",
        ticketFulfillmentLockedAt: null,
        ticketFulfillmentLockedBy: null,
        ticketFulfillmentLastError: null,
      },
    });
  }

  async markPaymentAmbiguous(id: string, input: { resultCode?: string; resultMessage?: string; rawCallback?: Prisma.InputJsonValue; nextReconciliationAt: Date; error?: string }, tx: Prisma.TransactionClient) {
    return tx.paymentTransaction.update({
      where: { id },
      data: {
        status: PaymentStatus.AMBIGUOUS,
        resultCode: input.resultCode,
        resultMessage: input.resultMessage,
        rawCallback: input.rawCallback,
        nextReconciliationAt: input.nextReconciliationAt,
        lastReconciliationError: input.error?.slice(0, 500),
        reconciliationAttemptCount: { increment: 1 },
      },
    });
  }

  async findPaymentTransactionById(id: string, tx?: Prisma.TransactionClient) {
    const client = getClient(tx);
    return client.paymentTransaction.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });
  }

  async findLatestMpesaTransactionForOrder(orderId: string, tx?: Prisma.TransactionClient) {
    const client = getClient(tx);
    return client.paymentTransaction.findFirst({
      where: {
        orderId,
        provider: PaymentProvider.MPESA,
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async hasRecentActiveMpesaTransaction(orderId: string, since: Date, tx?: Prisma.TransactionClient) {
    const client = getClient(tx);
    const count = await client.paymentTransaction.count({
      where: {
        orderId,
        provider: PaymentProvider.MPESA,
        createdAt: { gte: since },
        status: { in: [PaymentStatus.INITIATED, PaymentStatus.PENDING] },
      },
    });
    return count > 0;
  }

  async setOrderPaymentSubmitted(orderId: string, at: Date, tx: Prisma.TransactionClient) {
    return tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAYMENT_SUBMITTED,
        verificationSubmittedAt: at,
      },
    });
  }

  async listAdminManualPayments(filters: AdminManualPaymentQueueFilters) {
    const where: Prisma.PaymentProofSubmissionWhereInput = {
      verificationStatus:
        filters.verificationStatus === "pending_review"
          ? PaymentVerificationStatus.PENDING
          : filters.verificationStatus === "approved"
            ? PaymentVerificationStatus.APPROVED
            : filters.verificationStatus === "rejected"
              ? PaymentVerificationStatus.REJECTED
              : undefined,
      orderId: filters.orderId,
      OR: filters.search
        ? [
            { payerName: { contains: filters.search } },
            { phoneNumber: { contains: filters.search } },
            { transactionReference: { contains: filters.search } },
            { order: { orderNumber: { contains: filters.search } } },
            { order: { buyerName: { contains: filters.search } } },
            { order: { buyerPhone: { contains: filters.search } } },
            { order: { event: { title: { contains: filters.search } } } },
          ]
        : undefined,
    };

    return prisma.paymentProofSubmission.findMany({
      where,
      orderBy: [{ submittedAt: "desc" }],
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            currency: true,
            status: true,
            event: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });
  }

  async getManualPaymentSubmissionById(id: string, tx?: Prisma.TransactionClient) {
    const client = getClient(tx);
    return client.paymentProofSubmission.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            event: {
              select: {
                id: true,
                slug: true,
                title: true,
                startAt: true,
                endAt: true,
                venueName: true,
              },
            },
            items: {
              include: {
                ticketTier: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            tickets: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  }

  async approvePaymentProofSubmission(
    input: {
      id: string;
      reviewedByUserId: string;
      verificationNote?: string;
      reviewedAt: Date;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.paymentProofSubmission.update({
      where: { id: input.id },
      data: {
        verificationStatus: PaymentVerificationStatus.APPROVED,
        verificationNote: input.verificationNote,
        reviewedAt: input.reviewedAt,
        reviewedByUserId: input.reviewedByUserId,
      },
    });
  }

  async rejectPaymentProofSubmission(
    input: {
      id: string;
      reviewedByUserId: string;
      verificationNote?: string;
      reviewedAt: Date;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.paymentProofSubmission.update({
      where: { id: input.id },
      data: {
        verificationStatus: PaymentVerificationStatus.REJECTED,
        verificationNote: input.verificationNote,
        reviewedAt: input.reviewedAt,
        reviewedByUserId: input.reviewedByUserId,
      },
    });
  }

  async setOrderStatus(
    orderId: string,
    status: OrderStatus,
    tx: Prisma.TransactionClient,
    options?: {
      paidAt?: Date;
      ticketDeliveryStatus?: "PENDING" | "SENT" | "FAILED";
    },
  ) {
    return tx.order.update({
      where: { id: orderId },
      data: {
        status,
        paidAt: options?.paidAt,
        ticketDeliveryStatus: options?.ticketDeliveryStatus,
      },
    });
  }

  async transitionOrderStatus(
    orderId: string,
    expectedCurrentStatuses: OrderStatus[],
    nextStatus: OrderStatus,
    tx: Prisma.TransactionClient,
    options?: {
      paidAt?: Date;
      ticketDeliveryStatus?: "PENDING" | "SENT" | "FAILED";
      verificationSubmittedAt?: Date;
    },
  ) {
    const updated = await tx.order.updateMany({
      where: {
        id: orderId,
        status: { in: expectedCurrentStatuses },
      },
      data: {
        status: nextStatus,
        paidAt: options?.paidAt,
        ticketDeliveryStatus: options?.ticketDeliveryStatus,
        verificationSubmittedAt: options?.verificationSubmittedAt,
      },
    });

    return updated.count > 0;
  }

  async updateManualPaymentTransactionResult(
    input: {
      orderId: string;
      providerReference: string;
      status: PaymentStatus;
      completedAt: Date;
      resultCode: string;
      resultMessage: string;
    },
    tx: Prisma.TransactionClient,
  ) {
    await tx.paymentTransaction.updateMany({
      where: {
        orderId: input.orderId,
        providerReference: input.providerReference,
      },
      data: {
        status: input.status,
        completedAt: input.completedAt,
        resultCode: input.resultCode,
        resultMessage: input.resultMessage,
      },
    });
  }

  async completePaymentTransactionById(
    input: {
      id: string;
      status: PaymentStatus;
      completedAt: Date;
      resultCode: string;
      resultMessage: string;
      externalTransactionId?: string;
      providerReceipt?: string;
      providerConfirmedAt?: Date;
      rawCallback?: Prisma.InputJsonValue;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.paymentTransaction.update({
      where: { id: input.id },
      data: {
        status: input.status,
        completedAt: input.completedAt,
        resultCode: input.resultCode,
        resultMessage: input.resultMessage,
        externalTransactionId: input.externalTransactionId,
        providerReceipt: input.providerReceipt,
        providerConfirmedAt: input.providerConfirmedAt,
        rawCallback: input.rawCallback,
      },
    });
  }

  async completePaymentTransactionByIdIfNonTerminal(
    input: {
      id: string;
      completedAt: Date;
      nextStatus: PaymentStatus;
      resultCode: string;
      resultMessage: string;
      externalTransactionId?: string;
      providerReceipt?: string;
      providerConfirmedAt?: Date;
      rawCallback?: Prisma.InputJsonValue;
    },
    tx: Prisma.TransactionClient,
  ) {
    const updated = await tx.paymentTransaction.updateMany({
      where: {
        id: input.id,
        status: {
          in: [PaymentStatus.INITIATED, PaymentStatus.PENDING, PaymentStatus.AMBIGUOUS],
        },
      },
      data: {
        status: input.nextStatus,
        completedAt: input.completedAt,
        resultCode: input.resultCode,
        resultMessage: input.resultMessage,
        externalTransactionId: input.externalTransactionId,
        providerReceipt: input.providerReceipt,
        providerConfirmedAt: input.providerConfirmedAt,
        rawCallback: input.rawCallback,
      },
    });
    return updated.count > 0;
  }

  async recordPaymentTransactionCallbackIfNonTerminal(
    input: {
      id: string;
      resultCode: string;
      resultMessage: string;
      rawCallback?: Prisma.InputJsonValue;
    },
    tx: Prisma.TransactionClient,
  ) {
    const updated = await tx.paymentTransaction.updateMany({
      where: {
        id: input.id,
        status: {
          in: [PaymentStatus.INITIATED, PaymentStatus.PENDING, PaymentStatus.AMBIGUOUS],
        },
      },
      data: {
        status: PaymentStatus.AMBIGUOUS,
        resultCode: input.resultCode,
        resultMessage: input.resultMessage,
        rawCallback: input.rawCallback,
      },
    });

    return updated.count > 0;
  }

  async markPendingMpesaTransactionsFailedForExpiredOrders(now: Date) {
    return prisma.paymentTransaction.updateMany({
      where: {
        provider: PaymentProvider.MPESA,
        status: { in: [PaymentStatus.INITIATED, PaymentStatus.PENDING, PaymentStatus.AMBIGUOUS] },
        order: { status: OrderStatus.EXPIRED },
      },
      data: {
        status: PaymentStatus.AMBIGUOUS,
        nextReconciliationAt: now,
        resultCode: "ORDER_EXPIRED",
        resultMessage: "Order expired before MPESA confirmation",
      },
    });
  }

  async listAdminMpesaTransactions(filters: MpesaTransactionAuditFilters) {
    const mappedStatus =
      filters.status === "initiated"
        ? PaymentStatus.INITIATED
        : filters.status === "pending"
          ? PaymentStatus.PENDING
          : filters.status === "ambiguous"
            ? PaymentStatus.AMBIGUOUS
            : filters.status === "paid"
            ? PaymentStatus.SUCCEEDED
            : filters.status === "failed"
              ? PaymentStatus.FAILED
              : filters.status === "cancelled"
                ? PaymentStatus.CANCELLED
                : filters.status === "refunded"
                  ? PaymentStatus.REFUNDED
                  : undefined;

    return prisma.paymentTransaction.findMany({
      where: {
        provider: PaymentProvider.MPESA,
        orderId: filters.orderId,
        status: mappedStatus,
        OR: filters.search
          ? [
              { providerReference: { contains: filters.search } },
              { externalRequestId: { contains: filters.search } },
              { externalTransactionId: { contains: filters.search } },
              { order: { orderNumber: { contains: filters.search } } },
              { order: { buyerPhone: { contains: filters.search } } },
            ]
          : undefined,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            buyerPhone: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: filters.limit ?? 100,
    });
  }
}

export function mapPaymentMethodToProvider(method: ManualPaymentMethod): PaymentProvider {
  if (method === "mpesa") return PaymentProvider.MPESA;
  if (method === "bank") return PaymentProvider.BANK;
  return PaymentProvider.MANUAL;
}

export function mapPaymentVerificationStatus(status: PaymentVerificationStatus) {
  if (status === PaymentVerificationStatus.APPROVED) return "approved" as const;
  if (status === PaymentVerificationStatus.REJECTED) return "rejected" as const;
  return "pending_review" as const;
}

export function mapOrderLifecycleStatus(status: OrderStatus) {
  if (status === OrderStatus.PAYMENT_SUBMITTED) return "payment_submitted" as const;
  if (status === OrderStatus.PAYMENT_VERIFIED) return "payment_verified" as const;
  if (status === OrderStatus.PAYMENT_REJECTED) return "payment_rejected" as const;
  if (status === OrderStatus.PAID) return "paid" as const;
  if (status === OrderStatus.EXPIRED) return "expired" as const;
  return "pending_payment" as const;
}
