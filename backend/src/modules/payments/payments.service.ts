import { OrderStatus, PaymentStatus, PaymentVerificationStatus } from "@prisma/client";
import { NotFoundError, ValidationError } from "../../common/errors/httpErrors.js";
import { TicketsService } from "../tickets/tickets.service.js";
import {
  mapOrderLifecycleStatus,
  mapPaymentMethodToProvider,
  mapPaymentVerificationStatus,
  PaymentsRepository,
} from "./payments.repository.js";
import type {
  AdminManualPaymentQueueFilters,
  ReviewManualPaymentInput,
  SubmitManualPaymentInput,
  SubmittedPaymentProofRecord,
} from "./payments.types.js";

type ScreenshotAsset = {
  url: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
};

function assertScreenshotAsset(asset?: ScreenshotAsset) {
  if (!asset) return;

  if (!asset.storageKey.startsWith("payment-proof/")) {
    throw new ValidationError("Invalid screenshot storage key");
  }

  if (!asset.url.includes("/media/files/payment-proof/")) {
    throw new ValidationError("Invalid screenshot URL");
  }

  const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowedMimeTypes.has(asset.mimeType)) {
    throw new ValidationError("Unsupported screenshot file type");
  }

  if (asset.sizeBytes <= 0 || asset.sizeBytes > 5 * 1024 * 1024) {
    throw new ValidationError("Screenshot exceeds allowed size");
  }
}

export class PaymentsService {
  constructor(
    private readonly repository: PaymentsRepository = new PaymentsRepository(),
    private readonly ticketsService: TicketsService = new TicketsService(),
  ) {}

  async submitManualPaymentProof(
    publicToken: string,
    input: SubmitManualPaymentInput,
    screenshotAsset?: ScreenshotAsset,
  ): Promise<SubmittedPaymentProofRecord> {
    const now = new Date();
    assertScreenshotAsset(screenshotAsset);

    const submission = await this.repository.withTransaction(async (tx) => {
      const order = await this.repository.findOrderByPublicToken(publicToken, tx);
      if (!order) {
        throw new NotFoundError("Order not found");
      }

      if (order.status === OrderStatus.EXPIRED) {
        throw new ValidationError("Order has expired");
      }

      if (order.status === OrderStatus.PAID || order.status === OrderStatus.PAYMENT_VERIFIED) {
        throw new ValidationError("Order is already paid");
      }

      if (order.status === OrderStatus.PAYMENT_SUBMITTED) {
        throw new ValidationError("Payment proof is already under review");
      }

      if (input.amountPaid < Number(order.totalAmount)) {
        throw new ValidationError("Amount paid is lower than the required order total");
      }

      const createdSubmission = await this.repository.createPaymentProofSubmission(
        {
          orderId: order.id,
          paymentMethod: mapPaymentMethodToProvider(input.paymentMethod),
          payerName: input.payerName,
          phoneNumber: input.phoneNumber,
          amountPaid: input.amountPaid,
          transactionReference: input.transactionReference,
          screenshotUrl: screenshotAsset?.url,
          screenshotStorageKey: screenshotAsset?.storageKey,
          screenshotMimeType: screenshotAsset?.mimeType,
          screenshotSizeBytes: screenshotAsset?.sizeBytes,
          notes: input.notes,
        },
        tx,
      );

      await this.repository.createManualPaymentTransaction(
        {
          orderId: order.id,
          provider: mapPaymentMethodToProvider(input.paymentMethod),
          amount: input.amountPaid,
          currency: order.currency,
          providerReference: input.transactionReference,
          rawRequest: {
            source: "manual-payment-proof",
            submittedAt: now.toISOString(),
            orderPublicToken: publicToken,
          },
        },
        tx,
      );

      await this.repository.setOrderPaymentSubmitted(order.id, now, tx);

      return createdSubmission;
    });

    return {
      id: submission.id,
      orderNumber: submission.order.orderNumber,
      submittedAt: submission.submittedAt.toISOString(),
      verificationStatus: "pending_review",
    };
  }

  async listAdminManualPayments(filters: AdminManualPaymentQueueFilters) {
    const records = await this.repository.listAdminManualPayments(filters);

    return records.map((record) => ({
      id: record.id,
      orderId: record.order.id,
      orderNumber: record.order.orderNumber,
      eventTitle: record.order.event.title,
      payerName: record.payerName,
      phoneNumber: record.phoneNumber,
      amountPaid: Number(record.amountPaid),
      currency: record.order.currency,
      transactionReference: record.transactionReference,
      screenshotUrl: record.screenshotUrl ?? undefined,
      notes: record.notes ?? undefined,
      submittedAt: record.submittedAt.toISOString(),
      verificationStatus: mapPaymentVerificationStatus(record.verificationStatus),
      verificationNote: record.verificationNote ?? undefined,
      orderStatus: mapOrderLifecycleStatus(record.order.status),
    }));
  }

  async approveManualPaymentSubmission(id: string, reviewerId: string, input: ReviewManualPaymentInput) {
    const now = new Date();

    const result = await this.repository.withTransaction(async (tx) => {
      const submission = await this.repository.getManualPaymentSubmissionById(id, tx);
      if (!submission) {
        throw new NotFoundError("Payment submission not found");
      }

      if (submission.verificationStatus !== PaymentVerificationStatus.PENDING) {
        throw new ValidationError("Payment submission has already been reviewed");
      }

      await this.repository.approvePaymentProofSubmission(
        {
          id: submission.id,
          reviewedByUserId: reviewerId,
          verificationNote: input.verificationNote,
          reviewedAt: now,
        },
        tx,
      );

      await this.repository.setOrderStatus(submission.orderId, OrderStatus.PAYMENT_VERIFIED, tx);
      await this.repository.updateManualPaymentTransactionResult(
        {
          orderId: submission.orderId,
          providerReference: submission.transactionReference,
          status: PaymentStatus.SUCCEEDED,
          completedAt: now,
          resultCode: "MANUAL_APPROVED",
          resultMessage: "Manual payment verified by admin",
        },
        tx,
      );

      const issuedTickets = await this.ticketsService.issueTicketsForOrder(submission.orderId, tx);

      await this.repository.setOrderStatus(submission.orderId, OrderStatus.PAID, tx, {
        paidAt: now,
        ticketDeliveryStatus: "SENT",
      });

      return {
        orderNumber: submission.order.orderNumber,
        ticketsIssued: issuedTickets.length,
      };
    });

    return result;
  }

  async rejectManualPaymentSubmission(id: string, reviewerId: string, input: ReviewManualPaymentInput) {
    const now = new Date();

    const result = await this.repository.withTransaction(async (tx) => {
      const submission = await this.repository.getManualPaymentSubmissionById(id, tx);
      if (!submission) {
        throw new NotFoundError("Payment submission not found");
      }

      if (submission.verificationStatus !== PaymentVerificationStatus.PENDING) {
        throw new ValidationError("Payment submission has already been reviewed");
      }

      await this.repository.rejectPaymentProofSubmission(
        {
          id: submission.id,
          reviewedByUserId: reviewerId,
          verificationNote: input.verificationNote,
          reviewedAt: now,
        },
        tx,
      );

      await this.repository.setOrderStatus(submission.orderId, OrderStatus.PAYMENT_REJECTED, tx);
      await this.repository.updateManualPaymentTransactionResult(
        {
          orderId: submission.orderId,
          providerReference: submission.transactionReference,
          status: PaymentStatus.FAILED,
          completedAt: now,
          resultCode: "MANUAL_REJECTED",
          resultMessage: "Manual payment rejected by admin",
        },
        tx,
      );

      return {
        orderNumber: submission.order.orderNumber,
      };
    });

    return result;
  }
}
