import { OrderStatus, PaymentStatus, PaymentVerificationStatus } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { env } from "../../config/index.js";
import { NotFoundError, ValidationError } from "../../common/errors/httpErrors.js";
import { logger } from "../../common/utils/logger.js";
import { TicketsService } from "../tickets/tickets.service.js";
import {
  mapOrderLifecycleStatus,
  mapPaymentMethodToProvider,
  mapPaymentVerificationStatus,
  PaymentsRepository,
} from "./payments.repository.js";
import type {
  AdminManualPaymentQueueFilters,
  InitiateStkPushInput,
  InitiateStkPushResult,
  ReviewManualPaymentInput,
  ReverifyMpesaTransactionResult,
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

function toMpesaPhone(phone: string) {
  const digits = phone.replace(/\D+/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  throw new ValidationError("Use a valid Kenyan phone number format (07... or 254...)");
}

function createDarajaPassword(shortCode: string, passkey: string, timestamp: string) {
  return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");
}

function getTimestamp(now: Date) {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}

type DarajaStkQueryResult = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResponseCode?: string;
  ResponseDescription?: string;
  ResultCode: string;
  ResultDesc: string;
  MpesaReceiptNumber?: string;
  Amount?: string | number;
  PhoneNumber?: string | number;
};

export class PaymentsService {
  constructor(
    private readonly repository: PaymentsRepository = new PaymentsRepository(),
    private readonly ticketsService: TicketsService = new TicketsService(),
  ) {}

  private mapPaymentStatusForAudit(status: PaymentStatus) {
    if (status === PaymentStatus.INITIATED) return "initiated" as const;
    if (status === PaymentStatus.PENDING) return "pending" as const;
    if (status === PaymentStatus.AMBIGUOUS) return "ambiguous" as const;
    if (status === PaymentStatus.SUCCEEDED) return "paid" as const;
    if (status === PaymentStatus.CANCELLED) return "cancelled" as const;
    if (status === PaymentStatus.REFUNDED) return "refunded" as const;
    return "failed" as const;
  }

  private shouldAcceptLateSuccess(orderStatus: OrderStatus, reservationExpiresAt: Date, now: Date) {
    if (orderStatus !== OrderStatus.EXPIRED) return { accept: true as const, review: false as const };
    const graceMs = env.MPESA_LATE_PAYMENT_GRACE_MINUTES * 60 * 1000;
    const withinGrace = now.getTime() <= reservationExpiresAt.getTime() + graceMs;
    if (withinGrace) return { accept: true as const, review: false as const };
    if (env.MPESA_LATE_PAYMENT_POLICY === "reject") return { accept: false as const, review: false as const };
    if (env.MPESA_LATE_PAYMENT_POLICY === "manual_review") return { accept: false as const, review: true as const };
    return { accept: withinGrace, review: !withinGrace };
  }

  private classifyProviderFailure(resultCode: string) {
    if (resultCode === "1032") return PaymentStatus.CANCELLED;
    if (["1", "2001", "2006"].includes(resultCode)) return PaymentStatus.FAILED;
    return PaymentStatus.AMBIGUOUS;
  }

  private assertDarajaConfigured() {
    if (!env.MPESA_CONSUMER_KEY || !env.MPESA_CONSUMER_SECRET || !env.MPESA_SHORTCODE || !env.MPESA_PASSKEY || !env.MPESA_CALLBACK_URL) {
      throw new ValidationError("M-Pesa STK is not configured on the server");
    }
  }

  private getDarajaBaseUrl() {
    return env.MPESA_DARAJA_ENV === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";
  }

  private async darajaRequest<T>(path: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.MPESA_TIMEOUT_SECONDS * 1000);
    try {
      const response = await fetch(`${this.getDarajaBaseUrl()}${path}`, {
        ...init,
        signal: controller.signal,
      });
      const json = (await response.json()) as T & { errorMessage?: string };
      if (!response.ok) {
        throw new ValidationError(json.errorMessage ?? "Failed to complete Daraja request");
      }
      return json;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getDarajaAccessToken() {
    this.assertDarajaConfigured();
    const auth = Buffer.from(`${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`).toString("base64");
    const payload = await this.darajaRequest<{ access_token: string; expires_in: string }>(
      "/oauth/v1/generate?grant_type=client_credentials",
      { method: "GET", headers: { Authorization: `Basic ${auth}` } },
    );
    return payload.access_token;
  }

  async initiateStkPush(publicToken: string, input: InitiateStkPushInput, idempotencyKey?: string): Promise<InitiateStkPushResult> {
    this.assertDarajaConfigured();
    const now = new Date();
    const normalizedPhone = toMpesaPhone(input.phoneNumber);
    const key = idempotencyKey?.trim() || randomUUID();
    const accessToken = await this.getDarajaAccessToken();

    const result = await this.repository.withTransaction(async (tx) => {
      const order = await this.repository.findOrderByPublicToken(publicToken, tx);
      if (!order) throw new NotFoundError("Order not found");
      if (order.status === OrderStatus.EXPIRED) throw new ValidationError("Order has expired");
      if (order.status === OrderStatus.PAID || order.status === OrderStatus.PAYMENT_VERIFIED) {
        throw new ValidationError("Order is already paid");
      }
      if (Number(order.totalAmount) <= 0) {
        throw new ValidationError("Order amount is invalid for MPESA checkout");
      }

      const cooldownSince = new Date(now.getTime() - env.MPESA_STK_INITIATE_COOLDOWN_SECONDS * 1000);
      const hasRecent = await this.repository.hasRecentActiveMpesaTransaction(order.id, cooldownSince, tx);
      if (hasRecent) {
        throw new ValidationError("A payment prompt was sent recently. Please wait before retrying.");
      }

      const latestMpesaTx = await this.repository.findLatestMpesaTransactionForOrder(order.id, tx);
      if (latestMpesaTx?.status === PaymentStatus.INITIATED || latestMpesaTx?.status === PaymentStatus.PENDING) {
        const oldestRetryAt = new Date(latestMpesaTx.createdAt.getTime() + env.MPESA_STK_PENDING_RETRY_MINUTES * 60 * 1000);
        if (oldestRetryAt > now) {
          throw new ValidationError("A payment is still pending confirmation. Try again shortly.");
        }
      }

      const timestamp = getTimestamp(now);
      const password = createDarajaPassword(env.MPESA_SHORTCODE, env.MPESA_PASSKEY, timestamp);

      const stkRequestBody = {
        BusinessShortCode: env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(Number(order.totalAmount)),
        PartyA: normalizedPhone,
        PartyB: env.MPESA_SHORTCODE,
        PhoneNumber: normalizedPhone,
        CallBackURL: env.MPESA_CALLBACK_URL,
        AccountReference: order.orderNumber,
        TransactionDesc: `Ticket payment ${order.orderNumber}`,
      };

      const stkResponse = await this.darajaRequest<{
        MerchantRequestID: string;
        CheckoutRequestID: string;
        ResponseCode: string;
        ResponseDescription: string;
        CustomerMessage: string;
      }>("/mpesa/stkpush/v1/processrequest", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkRequestBody),
      });

      if (stkResponse.ResponseCode !== "0") {
        throw new ValidationError(stkResponse.ResponseDescription || "M-Pesa STK request was not accepted");
      }

      await this.repository.createMpesaStkTransaction(
        {
          orderId: order.id,
          amount: Number(order.totalAmount),
          currency: order.currency,
          idempotencyKey: key,
          externalRequestId: stkResponse.CheckoutRequestID,
          providerReference: stkResponse.MerchantRequestID,
          merchantRequestId: stkResponse.MerchantRequestID,
          providerAccountKey: env.MPESA_SHORTCODE,
          payerPhone: normalizedPhone,
          rawRequest: stkRequestBody,
          rawResponse: stkResponse,
        },
        tx,
      );

      return {
        orderNumber: order.orderNumber,
        customerMessage: stkResponse.CustomerMessage,
        responseCode: stkResponse.ResponseCode,
        paymentStatus: "pending" as const,
      };
    });

    return result;
  }

  private extractCallbackMetadata(payload: unknown) {
    const callback = payload as {
      Body?: {
        stkCallback?: {
          MerchantRequestID?: string;
          CheckoutRequestID?: string;
          ResultCode?: number;
          ResultDesc?: string;
          CallbackMetadata?: { Item?: Array<{ Name?: string; Value?: string | number }> };
        };
      };
    };
    const stkCallback = callback.Body?.stkCallback;
    const metadataItems = stkCallback?.CallbackMetadata?.Item ?? [];
    const metadataMap = new Map<string, string | number | undefined>();
    for (const item of metadataItems) {
      if (!item?.Name) continue;
      metadataMap.set(item.Name, item.Value);
    }
    return {
      merchantRequestId: stkCallback?.MerchantRequestID,
      checkoutRequestId: stkCallback?.CheckoutRequestID,
      resultCode: stkCallback?.ResultCode ?? -1,
      resultDesc: stkCallback?.ResultDesc ?? "Unknown callback status",
      metadataMap,
    };
  }

  private getCallbackReceipt(metadataMap: Map<string, string | number | undefined>) {
    const receipt = metadataMap.get("MpesaReceiptNumber");
    return typeof receipt === "string" && receipt.trim() ? receipt.trim() : undefined;
  }

  private getCallbackPhone(metadataMap: Map<string, string | number | undefined>) {
    const value = metadataMap.get("PhoneNumber") ?? metadataMap.get("Phone");
    return value === undefined ? undefined : toMpesaPhone(String(value));
  }

  private getCallbackAmount(metadataMap: Map<string, string | number | undefined>) {
    const value = metadataMap.get("Amount");
    if (value === undefined) return undefined;
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : undefined;
  }

  private async queryMpesaStkStatus(checkoutRequestId: string): Promise<DarajaStkQueryResult> {
    const accessToken = await this.getDarajaAccessToken();
    const timestamp = getTimestamp(new Date());
    const password = createDarajaPassword(env.MPESA_SHORTCODE, env.MPESA_PASSKEY, timestamp);

    return this.darajaRequest<DarajaStkQueryResult>("/mpesa/stkpushquery/v1/query", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    });
  }

  private async applyMpesaPaymentResult(input: {
    checkoutRequestId: string;
    merchantRequestId?: string;
    providerAccountKey?: string;
    resultCode: string;
    resultDesc: string;
    rawCallback?: Prisma.InputJsonValue;
    externalTransactionId?: string;
    providerReceipt?: string;
    amount?: number;
    payerPhone?: string;
  }) {
    const now = new Date();
    let verifiedOrderId: string | undefined;
    let mappedStatus: ReturnType<PaymentsService["mapPaymentStatusForAudit"]> | undefined;
    let orderNumber: string | undefined;

    await this.repository.withTransaction(async (tx) => {
      const transaction = await this.repository.findPaymentTransactionByExternalRequestId(input.checkoutRequestId, tx);
      if (!transaction) {
        logger.warn("MPESA transaction not found", { checkoutRequestId: input.checkoutRequestId });
        return;
      }
      orderNumber = transaction.order.orderNumber;

      const merchantMismatch = Boolean(input.merchantRequestId && transaction.providerReference && input.merchantRequestId !== transaction.providerReference);
      const accountMismatch = Boolean(input.providerAccountKey && transaction.providerAccountKey && input.providerAccountKey !== transaction.providerAccountKey);
      if (merchantMismatch || accountMismatch) {
        logger.warn("MPESA merchant request mismatch", {
          checkoutRequestId: input.checkoutRequestId,
          expectedMerchantRequestId: transaction.providerReference,
          receivedMerchantRequestId: input.merchantRequestId,
          expectedProviderAccountKey: transaction.providerAccountKey,
          receivedProviderAccountKey: input.providerAccountKey,
        });
        await this.repository.markPaymentAmbiguous(transaction.id, {
          resultCode: input.resultCode,
          resultMessage: merchantMismatch ? "M-Pesa merchant request mismatch" : "M-Pesa provider account mismatch",
          rawCallback: input.rawCallback,
          nextReconciliationAt: new Date(now.getTime() + 60_000),
          error: merchantMismatch ? "M-Pesa merchant request mismatch" : "M-Pesa provider account mismatch",
        }, tx);
        mappedStatus = "ambiguous";
        return;
      }

      if (input.resultCode === "0") {
        const expectedAmount = Number(transaction.amount);
        const amountMatches = input.amount === undefined || Math.abs(input.amount - expectedAmount) < 0.005;
        const phoneMatches = !input.payerPhone || !transaction.payerPhone || input.payerPhone === transaction.payerPhone;
        if (!input.providerReceipt || !amountMatches || !phoneMatches) {
          await this.repository.markPaymentAmbiguous(transaction.id, {
            resultCode: input.resultCode,
            resultMessage: !input.providerReceipt ? "Successful provider result did not include a receipt" : "Provider payment evidence did not match the order",
            rawCallback: input.rawCallback,
            nextReconciliationAt: new Date(now.getTime() + 60_000),
            error: !amountMatches ? "M-Pesa amount mismatch" : !phoneMatches ? "M-Pesa phone mismatch" : "M-Pesa receipt missing",
          }, tx);
          mappedStatus = "ambiguous";
          return;
        }
      }

      if (transaction.status !== PaymentStatus.INITIATED && transaction.status !== PaymentStatus.PENDING && transaction.status !== PaymentStatus.AMBIGUOUS) {
        logger.info("Duplicate/terminal MPESA result ignored", {
          checkoutRequestId: input.checkoutRequestId,
          transactionId: transaction.id,
        });
        mappedStatus = this.mapPaymentStatusForAudit(transaction.status);
        return;
      }

      if (input.resultCode === "0") {
        const latePolicy = this.shouldAcceptLateSuccess(transaction.order.status, transaction.order.reservationExpiresAt, now);

        if (latePolicy.review) {
          await this.repository.recordPaymentTransactionCallbackIfNonTerminal(
            {
              id: transaction.id,
              resultCode: input.resultCode,
              resultMessage: input.resultDesc,
              rawCallback: input.rawCallback,
            },
            tx,
          );
          await this.repository.transitionOrderStatus(
            transaction.orderId,
            [OrderStatus.EXPIRED],
            OrderStatus.PAYMENT_SUBMITTED,
            tx,
            { verificationSubmittedAt: now },
          );
          logger.warn("Late MPESA success requires manual review", {
            orderId: transaction.orderId,
            checkoutRequestId: input.checkoutRequestId,
            policy: env.MPESA_LATE_PAYMENT_POLICY,
          });
          mappedStatus = "pending";
          return;
        }

        if (!latePolicy.accept) {
          await this.repository.markPaymentAmbiguous(transaction.id, {
            resultCode: "LATE_PAYMENT_REVIEW",
            resultMessage: "Payment arrived after expiry grace window",
            rawCallback: input.rawCallback,
            nextReconciliationAt: new Date(now.getTime() + 60 * 60_000),
            error: "Late M-Pesa success requires manual review",
          }, tx);
          await this.repository.transitionOrderStatus(
            transaction.orderId,
            [OrderStatus.EXPIRED],
            OrderStatus.PAYMENT_SUBMITTED,
            tx,
            { verificationSubmittedAt: now },
          );
          logger.warn("Late MPESA success requires manual review", { orderId: transaction.orderId, checkoutRequestId: input.checkoutRequestId });
          mappedStatus = "ambiguous";
          return;
        }

        const completed = await this.repository.completePaymentTransactionByIdIfNonTerminal(
          {
            id: transaction.id,
            completedAt: now,
            nextStatus: PaymentStatus.SUCCEEDED,
            resultCode: input.resultCode,
            resultMessage: input.resultDesc,
            externalTransactionId: input.externalTransactionId,
            providerReceipt: input.providerReceipt,
            providerConfirmedAt: now,
            rawCallback: input.rawCallback,
          },
          tx,
        );
        if (!completed) {
          mappedStatus = this.mapPaymentStatusForAudit(transaction.status);
          return;
        }

        const movedToVerified = await this.repository.transitionOrderStatus(
          transaction.orderId,
          [OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_REJECTED, OrderStatus.PAYMENT_SUBMITTED, OrderStatus.EXPIRED],
          OrderStatus.PAYMENT_VERIFIED,
          tx,
        );
        if (!movedToVerified && transaction.order.status !== OrderStatus.PAID && transaction.order.status !== OrderStatus.PAYMENT_VERIFIED) {
          logger.warn("MPESA callback could not transition order to PAYMENT_VERIFIED", {
            orderId: transaction.orderId,
            orderStatus: transaction.order.status,
          });
          mappedStatus = "paid";
          return;
        }

        verifiedOrderId = transaction.orderId;
        mappedStatus = "paid";
        logger.info("MPESA payment processed successfully", { orderId: transaction.orderId, checkoutRequestId: input.checkoutRequestId });
      } else {
        const failureStatus = this.classifyProviderFailure(input.resultCode);
        if (failureStatus === PaymentStatus.AMBIGUOUS) {
          await this.repository.markPaymentAmbiguous(transaction.id, {
            resultCode: input.resultCode,
            resultMessage: input.resultDesc,
            rawCallback: input.rawCallback,
            nextReconciliationAt: new Date(now.getTime() + 60_000),
            error: "Provider returned a non-definitive result",
          }, tx);
          await this.repository.transitionOrderStatus(
            transaction.orderId,
            [OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_SUBMITTED],
            OrderStatus.PAYMENT_SUBMITTED,
            tx,
            { verificationSubmittedAt: now },
          );
          mappedStatus = "ambiguous";
        } else {
          await this.repository.completePaymentTransactionByIdIfNonTerminal(
            {
              id: transaction.id,
              completedAt: now,
              nextStatus: failureStatus,
              resultCode: input.resultCode,
              resultMessage: input.resultDesc,
              rawCallback: input.rawCallback,
            },
            tx,
          );
          if (transaction.order.status === OrderStatus.PENDING_PAYMENT) {
            await this.repository.transitionOrderStatus(
              transaction.orderId,
              [OrderStatus.PENDING_PAYMENT],
              OrderStatus.PAYMENT_REJECTED,
              tx,
            );
          }
          mappedStatus = failureStatus === PaymentStatus.CANCELLED ? "cancelled" : "failed";
        }
      }
    });

    return {
      orderNumber,
      status: mappedStatus,
      verifiedOrderId,
      resultCode: input.resultCode,
      resultDesc: input.resultDesc,
    };
  }

  async fulfillVerifiedOrder(orderId: string) {
    const tickets = await this.ticketsService.issueTicketsForOrder(orderId);
    await this.repository.markOrderPaidAfterFulfillment(orderId, new Date());
    return { ticketsIssued: tickets.length, ticketDeliveryStatus: "pending" as const };
  }

  private async processMpesaStkCallbackByCheckoutRequestId(checkoutRequestId: string, payload: unknown) {
    const extracted = this.extractCallbackMetadata(payload);
    const mpesaReceipt = this.getCallbackReceipt(extracted.metadataMap);
    const callbackAmount = this.getCallbackAmount(extracted.metadataMap);
    const callbackPhone = this.getCallbackPhone(extracted.metadataMap);

    if (extracted.resultCode === 0) {
      const verification = await this.queryMpesaStkStatus(checkoutRequestId);
      if (verification.CheckoutRequestID && verification.CheckoutRequestID !== checkoutRequestId) {
        logger.warn("MPESA STK query checkout request mismatch", {
          checkoutRequestId,
          receivedCheckoutRequestId: verification.CheckoutRequestID,
        });
        return;
      }

      const result = await this.applyMpesaPaymentResult({
        checkoutRequestId,
        merchantRequestId: extracted.merchantRequestId,
        providerAccountKey: env.MPESA_SHORTCODE,
        resultCode: verification.ResultCode,
        resultDesc: verification.ResultDesc,
        externalTransactionId: mpesaReceipt,
        providerReceipt: mpesaReceipt,
        amount: callbackAmount,
        payerPhone: callbackPhone,
        rawCallback: payload as Prisma.InputJsonValue,
      });
      if (!result.status) throw new ValidationError("M-Pesa transaction was not found for callback");
      if (result.verifiedOrderId) await this.fulfillVerifiedOrder(result.verifiedOrderId);
      return;
    }

    const result = await this.applyMpesaPaymentResult({
      checkoutRequestId,
      merchantRequestId: extracted.merchantRequestId,
      resultCode: String(extracted.resultCode),
      resultDesc: extracted.resultDesc,
      rawCallback: payload as Prisma.InputJsonValue,
    });
    if (!result.status) throw new ValidationError("M-Pesa transaction was not found for callback");
    if (result.verifiedOrderId) await this.fulfillVerifiedOrder(result.verifiedOrderId);
  }

  async ingestMpesaStkCallback(payload: unknown) {
    const extracted = this.extractCallbackMetadata(payload);
    if (!extracted.checkoutRequestId) {
      throw new ValidationError("M-Pesa callback is missing checkout request id");
    }

    const payloadHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    const eventKey = createHash("sha256")
      .update(`${env.MPESA_DARAJA_ENV}:${env.MPESA_SHORTCODE}:${extracted.checkoutRequestId}:${payloadHash}`)
      .digest("hex");
    const inboxEvent = await this.repository.createCallbackInboxEvent({
      provider: "MPESA" as const,
      providerAccountKey: env.MPESA_SHORTCODE,
      eventKey,
      payloadHash,
      checkoutRequestId: extracted.checkoutRequestId,
      merchantRequestId: extracted.merchantRequestId,
      providerReceipt: this.getCallbackReceipt(extracted.metadataMap),
      resultCode: String(extracted.resultCode),
      resultDescription: extracted.resultDesc,
      payload: payload as Prisma.InputJsonValue,
      correlationId: randomUUID(),
    });

    return { accepted: true, message: inboxEvent?.status === "PROCESSED" ? "already processed" : "accepted" };
  }

  async processCallbackInboxEvent(id: string) {
    const event = await this.repository.getCallbackInboxEvent(id);
    if (!event) throw new NotFoundError("Payment callback event not found");
    if (!event.checkoutRequestId) throw new ValidationError("Callback event has no checkout request id");

    try {
      await this.processMpesaStkCallbackByCheckoutRequestId(event.checkoutRequestId, event.payload);
      const transaction = await this.repository.findPaymentTransactionByExternalRequestId(event.checkoutRequestId);
      if (transaction?.status === PaymentStatus.SUCCEEDED && transaction.order.status === OrderStatus.PAYMENT_VERIFIED) {
        await this.fulfillVerifiedOrder(transaction.order.id);
      }
      await this.repository.completeCallbackInboxEvent(id, transaction?.id);
    } catch (error) {
      const attempts = event.attemptCount + 1;
      const backoffMinutes = [0.5, 2, 5, 15, 30, 60][Math.min(attempts - 1, 5)] ?? 60;
      await this.repository.failCallbackInboxEvent(id, {
        nextAttemptAt: new Date(Date.now() + backoffMinutes * 60 * 1000),
        error: error instanceof Error ? error.message : String(error),
        manualReview: attempts >= env.MPESA_RECONCILIATION_MAX_ATTEMPTS,
      });
      throw error;
    }
  }

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
      if (submission.order.status === OrderStatus.PAID || submission.order.status === OrderStatus.PAYMENT_VERIFIED) {
        throw new ValidationError("Order is already settled by an automated payment");
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

      const movedToVerified = await this.repository.transitionOrderStatus(
        submission.orderId,
        [OrderStatus.PAYMENT_SUBMITTED, OrderStatus.PAYMENT_REJECTED, OrderStatus.PENDING_PAYMENT],
        OrderStatus.PAYMENT_VERIFIED,
        tx,
      );
      if (!movedToVerified) {
        throw new ValidationError("Order status changed during review. Refresh and try again.");
      }
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

      await this.repository.transitionOrderStatus(submission.orderId, [OrderStatus.PAYMENT_VERIFIED], OrderStatus.PAID, tx, {
        paidAt: now,
        ticketDeliveryStatus: "PENDING",
      });

      return {
        orderId: submission.orderId,
        orderNumber: submission.order.orderNumber,
        ticketsIssued: issuedTickets.length,
      };
    });

    const ticketDeliveryStatus = await this.ticketsService.deliverIssuedTicketsForOrder(result.orderId);

    return {
      orderNumber: result.orderNumber,
      ticketsIssued: result.ticketsIssued,
      ticketDeliveryStatus,
    };
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
      if (submission.order.status === OrderStatus.PAID || submission.order.status === OrderStatus.PAYMENT_VERIFIED) {
        throw new ValidationError("Order is already settled by an automated payment");
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

      const movedToRejected = await this.repository.transitionOrderStatus(
        submission.orderId,
        [OrderStatus.PAYMENT_SUBMITTED, OrderStatus.PENDING_PAYMENT],
        OrderStatus.PAYMENT_REJECTED,
        tx,
      );
      if (!movedToRejected) {
        throw new ValidationError("Order status changed during review. Refresh and try again.");
      }
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

  async reverifyMpesaTransaction(id: string): Promise<ReverifyMpesaTransactionResult> {
    const transaction = await this.repository.findPaymentTransactionById(id);
    if (!transaction) {
      throw new NotFoundError("M-Pesa transaction not found");
    }
    if (transaction.provider !== "MPESA") {
      throw new ValidationError("Only M-Pesa transactions can be reverified");
    }
    if (!transaction.externalRequestId) {
      throw new ValidationError("M-Pesa transaction is missing a checkout request id");
    }

    if (transaction.status !== PaymentStatus.INITIATED && transaction.status !== PaymentStatus.PENDING && transaction.status !== PaymentStatus.AMBIGUOUS) {
      return {
        orderNumber: transaction.order.orderNumber,
        status: this.mapPaymentStatusForAudit(transaction.status),
        resultCode: transaction.resultCode ?? undefined,
        resultDesc: transaction.resultMessage ?? undefined,
      };
    }

    const verification = await this.queryMpesaStkStatus(transaction.externalRequestId);
    const result = await this.applyMpesaPaymentResult({
      checkoutRequestId: transaction.externalRequestId,
      merchantRequestId: transaction.providerReference ?? undefined,
      providerAccountKey: env.MPESA_SHORTCODE,
      resultCode: verification.ResultCode,
      resultDesc: verification.ResultDesc,
      providerReceipt: verification.MpesaReceiptNumber ?? transaction.providerReceipt ?? undefined,
      externalTransactionId: verification.MpesaReceiptNumber ?? transaction.providerReceipt ?? undefined,
      amount: verification.Amount === undefined ? Number(transaction.amount) : Number(verification.Amount),
      payerPhone: verification.PhoneNumber === undefined ? transaction.payerPhone ?? undefined : toMpesaPhone(String(verification.PhoneNumber)),
      rawCallback: (transaction.rawCallback ?? {
        source: "admin-mpesa-reverify",
        queriedAt: new Date().toISOString(),
        response: verification,
      }) as Prisma.InputJsonValue,
    });

    const fulfillment = result.verifiedOrderId ? await this.fulfillVerifiedOrder(result.verifiedOrderId) : undefined;
    return {
      orderNumber: result.orderNumber ?? transaction.order.orderNumber,
      status: result.status ?? "pending",
      resultCode: result.resultCode,
      resultDesc: result.resultDesc,
      ticketsIssued: fulfillment?.ticketsIssued,
      ticketDeliveryStatus: fulfillment?.ticketDeliveryStatus,
    };
  }

  async listAdminMpesaTransactions(filters: {
    orderId?: string;
    search?: string;
    status?: "initiated" | "pending" | "ambiguous" | "paid" | "failed" | "cancelled" | "refunded";
    limit?: number;
  }) {
    const rows = await this.repository.listAdminMpesaTransactions(filters);
    return rows.map((row) => ({
      id: row.id,
      orderId: row.order.id,
      orderNumber: row.order.orderNumber,
      buyerPhone: row.order.buyerPhone,
      amount: Number(row.amount),
      currency: row.currency,
      checkoutRequestId: row.externalRequestId ?? undefined,
      merchantRequestId: row.providerReference ?? undefined,
      externalTransactionId: row.externalTransactionId ?? undefined,
      resultCode: row.resultCode ?? undefined,
      resultDesc: row.resultMessage ?? undefined,
      status: this.mapPaymentStatusForAudit(row.status),
      initiatedAt: row.initiatedAt.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      callbackReceived: Boolean(row.rawCallback),
      rawCallback: row.rawCallback ?? undefined,
    }));
  }
}
