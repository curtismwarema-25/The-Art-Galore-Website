import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  PaymentVerificationStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { AdminManualPaymentQueueFilters, ManualPaymentMethod } from "./payments.types.js";

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
