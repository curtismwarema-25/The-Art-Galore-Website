import { OrderStatus, PaymentProvider, PaymentStatus, PaymentVerificationStatus } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { env } from "../../config/index.js";
import { AppError } from "../../common/errors/AppError.js";
import { ConflictError, NotFoundError, ValidationError } from "../../common/errors/httpErrors.js";
import { logger } from "../../common/utils/logger.js";
import { requestMpesaReconciliationWake } from "./mpesaReconciliationSignal.js";
import { getMpesaReconciliationSchedule } from "./mpesaReconciliationPolicy.js";
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

export function assertScreenshotAsset(asset?: ScreenshotAsset) {
  if (!asset) return;

  const normalizedStorageKey = asset.storageKey.replace(/\\/g, "/");
  if (
    normalizedStorageKey !== asset.storageKey ||
    !normalizedStorageKey.startsWith("payment-proof/") ||
    normalizedStorageKey.includes("..")
  ) {
    throw new ValidationError("Invalid screenshot storage key");
  }

  const mediaPath = `${env.MEDIA_PUBLIC_BASE_PATH.replace(/^\/+|\/+$/g, "")}/${normalizedStorageKey}`;
  const expectedRelativeUrl = `${env.API_PREFIX.replace(/\/+$/g, "")}/${mediaPath}`;
  const expectedAbsoluteUrl = env.PUBLIC_API_URL
    ? `${env.PUBLIC_API_URL.replace(/\/+$/g, "")}/${mediaPath}`
    : undefined;

  if (asset.url !== expectedRelativeUrl && asset.url !== expectedAbsoluteUrl) {
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
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
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
  MerchantRequestID?: unknown;
  CheckoutRequestID?: unknown;
  ResponseCode?: unknown;
  ResponseDescription?: unknown;
  ResultCode?: unknown;
  ResultDesc?: unknown;
  MpesaReceiptNumber?: unknown;
  Amount?: unknown;
  PhoneNumber?: unknown;
};

export function normalizeDarajaCode(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : undefined;
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || undefined;
  }
  return undefined;
}

function normalizeDarajaText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, 300) : null;
}

function hasProviderValue(value: unknown) {
  if (value === undefined || value === null) return false;
  return typeof value === "string" ? value.trim().length > 0 : String(value).trim().length > 0;
}

function getProviderAmount(value: unknown) {
  if (!hasProviderValue(value)) return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : undefined;
}

function getProviderPhone(value: unknown) {
  if (!hasProviderValue(value)) return undefined;
  try {
    return toMpesaPhone(String(value));
  } catch {
    return undefined;
  }
}

export type MpesaStkQueryMetadata = {
  ResponseCode: string | null;
  ResponseDescription: string | null;
  ResultCode: string | null;
  ResultDesc: string | null;
  CheckoutRequestID: string | null;
  receiptPresent: boolean;
  queriedAt: string;
};

export function toMpesaStkQueryMetadata(result: DarajaStkQueryResult, queriedAt: string): MpesaStkQueryMetadata {
  return {
    ResponseCode: normalizeDarajaCode(result.ResponseCode) ?? null,
    ResponseDescription: normalizeDarajaText(result.ResponseDescription),
    ResultCode: normalizeDarajaCode(result.ResultCode) ?? null,
    ResultDesc: normalizeDarajaText(result.ResultDesc),
    CheckoutRequestID: normalizeDarajaText(result.CheckoutRequestID),
    receiptPresent: hasProviderValue(result.MpesaReceiptNumber),
    queriedAt,
  };
}

export function getQueryResultCode(result: DarajaStkQueryResult) {
  const responseCode = normalizeDarajaCode(result.ResponseCode);
  if (result.ResponseCode !== undefined && result.ResponseCode !== null && !responseCode) return undefined;
  if (responseCode && responseCode !== "0") return undefined;
  return normalizeDarajaCode(result.ResultCode);
}

export function getQueryResultDescription(result: DarajaStkQueryResult) {
  return normalizeDarajaText(result.ResultDesc)
    ?? normalizeDarajaText(result.ResponseDescription)
    ?? "M-Pesa query did not return a transaction result";
}

function getPaymentEvidenceFailure(input: {
  providerReceipt?: string;
  amount?: number;
  payerPhone?: string;
  expectedAmount: number;
  expectedPhone?: string | null;
}) {
  if (!input.providerReceipt?.trim()) return "Successful provider result did not include a receipt";
  if (input.amount === undefined || !Number.isFinite(input.amount)) return "Successful provider result did not include an amount";
  if (!input.payerPhone) return "Successful provider result did not include a phone number";
  if (Math.abs(input.amount - input.expectedAmount) >= 0.005) return "M-Pesa amount mismatch";
  if (input.expectedPhone && input.payerPhone !== input.expectedPhone) return "M-Pesa phone mismatch";
  return undefined;
}

type DarajaResponsePayload = {
  access_token?: string;
  expires_in?: string | number;
  errorMessage?: string;
  errorCode?: string;
  requestId?: string;
  [key: string]: unknown;
};

function sanitizeProviderResponseText(value: string) {
  return value
    .trim()
    .slice(0, 300)
    .replace(/("?(?:access_token|authorization|token|password|consumer_key|consumer_secret)"?\s*:\s*)"[^"]*"/gi, '$1"[redacted]"');
}

export class DarajaRequestError extends AppError {
  constructor(
    readonly providerStatus: number,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(
      providerStatus === 429 ? 503 : 502,
      providerStatus === 429 ? "M-Pesa is temporarily rate limiting status checks. Please wait and try again." : message,
      providerStatus === 429 ? "PAYMENT_PROVIDER_RATE_LIMITED" : "PAYMENT_PROVIDER_ERROR",
      { providerStatus },
    );
    this.name = "DarajaRequestError";
  }
}

function parseRetryAfterMs(value: string | null) {
  if (!value) return undefined;
  const seconds = Number(value);
  const milliseconds = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return undefined;
  return Math.min(milliseconds, 60 * 60 * 1000);
}

export class PaymentsService {
  private darajaAccessTokenCache?: { token: string; expiresAt: number };
  private darajaAccessTokenRequest?: Promise<string>;

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
    if (["1", "1037", "2001", "2006"].includes(resultCode)) return PaymentStatus.FAILED;
    return PaymentStatus.AMBIGUOUS;
  }

  private getAmbiguousReconciliationSchedule(attemptCount: number, now: Date, retryAfterMs?: number) {
    return getMpesaReconciliationSchedule({
      attemptCount,
      maxAttempts: env.MPESA_RECONCILIATION_MAX_ATTEMPTS,
      now,
      retryAfterMs,
    });
  }

  private assertDarajaConfigured() {
    if (
      !env.MPESA_CONSUMER_KEY.trim()
      || !env.MPESA_CONSUMER_SECRET.trim()
      || !env.MPESA_SHORTCODE.trim()
      || !env.MPESA_PASSKEY.trim()
      || !env.MPESA_CALLBACK_URL.trim()
    ) {
      throw new ValidationError("M-Pesa STK is not configured on the server");
    }
  }

  private getDarajaBaseUrl() {
    return env.MPESA_DARAJA_ENV === "production" && env.MPESA_LIVE_PAYMENTS_ENABLED
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";
  }

  private getStkPhone(phone: string) {
    return toMpesaPhone(phone);
  }

  private async darajaRequest<T>(path: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.MPESA_TIMEOUT_SECONDS * 1000);
    try {
      const baseUrl = this.getDarajaBaseUrl();
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });
      const responseText = await response.text();
      const contentType = response.headers.get("content-type") ?? "absent";
      let json: (T & DarajaResponsePayload) | undefined;
      try {
        const parsed = JSON.parse(responseText) as unknown;
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("Provider response was not a JSON object");
        }
        json = parsed as T & DarajaResponsePayload;
      } catch {
        const responseDescription = responseText.trim() ? "non-JSON" : "empty";
        logger.error(`Daraja returned an ${responseDescription} response`, {
          providerHost: new URL(baseUrl).host,
          path,
          httpStatus: response.status,
          contentType,
          bodyLength: responseText.length,
          responseExcerpt: sanitizeProviderResponseText(responseText) || "[empty]",
        });
        throw new DarajaRequestError(
          response.status,
          `Daraja returned an ${responseDescription} response (HTTP ${response.status})`,
          parseRetryAfterMs(response.headers.get("retry-after")),
        );
      }
      if (!response.ok) {
        logger.error("Daraja API request failed", {
          providerHost: new URL(baseUrl).host,
          path,
          httpStatus: response.status,
          contentType,
          bodyLength: responseText.length,
          errorCode: json.errorCode,
          requestId: json.requestId,
          errorMessage: json.errorMessage,
        });
        throw new DarajaRequestError(
          response.status,
          json.errorMessage || `Daraja request failed (HTTP ${response.status})`,
          parseRetryAfterMs(response.headers.get("retry-after")),
        );
      }
      return json;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.error("Daraja API request timed out", { path, timeoutSeconds: env.MPESA_TIMEOUT_SECONDS });
        throw new ValidationError(`Daraja request timed out after ${env.MPESA_TIMEOUT_SECONDS} seconds`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getDarajaAccessToken() {
    this.assertDarajaConfigured();
    const cacheSafetyWindowMs = 60_000;
    if (this.darajaAccessTokenCache && this.darajaAccessTokenCache.expiresAt > Date.now() + cacheSafetyWindowMs) {
      return this.darajaAccessTokenCache.token;
    }
    if (this.darajaAccessTokenRequest) return this.darajaAccessTokenRequest;

    const request = (async () => {
      const consumerKey = env.MPESA_CONSUMER_KEY.trim();
      const consumerSecret = env.MPESA_CONSUMER_SECRET.trim();
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
      const payload = await this.darajaRequest<{ access_token: string; expires_in: string | number }>(
        "/oauth/v1/generate?grant_type=client_credentials",
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Basic ${auth}`,
          },
        },
      );
      if (!payload.access_token) {
        throw new DarajaRequestError(502, "Daraja OAuth response did not include an access token");
      }
      const expiresInSeconds = Number(payload.expires_in);
      const cacheDurationMs = Number.isFinite(expiresInSeconds)
        ? Math.max(0, expiresInSeconds - cacheSafetyWindowMs / 1000) * 1000
        : 0;
      this.darajaAccessTokenCache = {
        token: payload.access_token,
        expiresAt: Date.now() + cacheDurationMs,
      };
      return payload.access_token;
    })();

    this.darajaAccessTokenRequest = request;
    try {
      return await request;
    } finally {
      if (this.darajaAccessTokenRequest === request) this.darajaAccessTokenRequest = undefined;
    }
  }

  async initiateStkPush(publicToken: string, input: InitiateStkPushInput, idempotencyKey?: string): Promise<InitiateStkPushResult> {
    this.assertDarajaConfigured();
    const now = new Date();
    const normalizedPhone = this.getStkPhone(input.phoneNumber);
    const key = idempotencyKey?.trim() || randomUUID();
    // Keep the database transaction short. Daraja is an external network call
    // and can take longer than Prisma's interactive transaction timeout.
    const order = await this.repository.findOrderByPublicToken(publicToken);
    if (!order) throw new NotFoundError("Order not found");
    if (order.status === OrderStatus.EXPIRED) throw new ValidationError("Order has expired");
    if (order.status === OrderStatus.PAID || order.status === OrderStatus.PAYMENT_VERIFIED) {
      throw new ValidationError("Order is already paid");
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT && order.status !== OrderStatus.PAYMENT_REJECTED) {
      throw new ValidationError("A payment has already been submitted for this order");
    }
    if (Number(order.totalAmount) <= 0) {
      throw new ValidationError("Order amount is invalid for MPESA checkout");
    }

    const idempotentTransaction = await this.repository.findPaymentTransactionByIdempotencyKey(key);
    if (idempotentTransaction) {
      if (idempotentTransaction.orderId !== order.id) {
        throw new ValidationError("This idempotency key is already associated with another order");
      }
      if (idempotentTransaction.reconciliationRequiresManualReview) {
        throw new ValidationError("This payment attempt needs review before another prompt can be sent. Contact support.");
      }
      if (idempotentTransaction.externalRequestId) {
        return {
          orderNumber: order.orderNumber,
          customerMessage: "Payment prompt already requested. Check your phone or payment status.",
          responseCode: "0",
          paymentStatus: "pending" as const,
        };
      }
      throw new ValidationError("This payment attempt is still being prepared. Check the order status shortly.");
    }

    const hasActiveMpesaPayment = order.paymentTransactions.some((payment) =>
      payment.provider === PaymentProvider.MPESA
      && (payment.status === PaymentStatus.INITIATED
        || payment.status === PaymentStatus.PENDING
        || payment.status === PaymentStatus.AMBIGUOUS),
    );
    if (hasActiveMpesaPayment) {
      throw new ValidationError("An M-Pesa payment is already being processed for this order.");
    }

    const cooldownSince = new Date(now.getTime() - env.MPESA_STK_INITIATE_COOLDOWN_SECONDS * 1000);
    const hasRecent = await this.repository.hasRecentActiveMpesaTransaction(order.id, cooldownSince);
    if (hasRecent) {
      throw new ValidationError("A payment prompt was sent recently. Please wait before retrying.");
    }

    const latestMpesaTx = await this.repository.findLatestMpesaTransactionForOrder(order.id);
    if (
      latestMpesaTx?.status === PaymentStatus.INITIATED
      || latestMpesaTx?.status === PaymentStatus.PENDING
      || latestMpesaTx?.status === PaymentStatus.AMBIGUOUS
    ) {
      const oldestRetryAt = new Date(latestMpesaTx.createdAt.getTime() + env.MPESA_STK_PENDING_RETRY_MINUTES * 60 * 1000);
      if (oldestRetryAt > now) {
        throw new ValidationError("A payment is still pending confirmation. Try again shortly.");
      }
    }

    const timestamp = getTimestamp(now);
    const password = createDarajaPassword(env.MPESA_SHORTCODE, env.MPESA_PASSKEY, timestamp);
    const accountReference = `AG${order.orderNumber.replace(/\D/g, "").slice(-10)}`;

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
      AccountReference: accountReference,
      TransactionDesc: "Art Galore ticket",
    };

    const accessToken = await this.getDarajaAccessToken();
    const reservation = await this.repository.withTransaction((tx) =>
      this.repository.reserveMpesaStkTransaction({
        orderId: order.id,
        amount: Number(order.totalAmount),
        currency: order.currency,
        idempotencyKey: key,
        providerAccountKey: env.MPESA_SHORTCODE,
        payerPhone: normalizedPhone,
        rawRequest: stkRequestBody,
      }, tx),
    );

    if (!reservation.created) {
      const existing = reservation.transaction;
      if (existing.idempotencyKey === key && existing.externalRequestId) {
        return {
          orderNumber: order.orderNumber,
          customerMessage: "Payment prompt already requested. Check your phone or payment status.",
          responseCode: "0",
          paymentStatus: "pending" as const,
        };
      }
      if (existing.idempotencyKey === key && existing.reconciliationRequiresManualReview) {
        throw new ValidationError("This payment attempt needs review before another prompt can be sent. Contact support.");
      }
      throw new ValidationError("A payment attempt is already being processed for this order.");
    }

    const paymentTransactionId = reservation.transaction.id;
    let stkResponse: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResponseCode: string;
      ResponseDescription: string;
      CustomerMessage: string;
    };
    try {
      stkResponse = await this.darajaRequest("/mpesa/stkpush/v1/processrequest", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkRequestBody),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof DarajaRequestError && error.providerStatus < 500) {
        await this.repository.markMpesaStkInitiationRejected(
          paymentTransactionId,
          `HTTP_${error.providerStatus}`,
          error.message,
        );
        throw error;
      }
      await this.repository.markMpesaStkInitiationUncertain(paymentTransactionId, message);
      logger.error("M-Pesa STK initiation outcome is uncertain", {
        paymentTransactionId,
        orderNumber: order.orderNumber,
        error: message,
      });
      throw new ValidationError("We could not confirm whether the payment prompt was sent. Check the order status or contact support before trying again.");
    }

    if (stkResponse.ResponseCode !== "0") {
      await this.repository.markMpesaStkInitiationRejected(
        paymentTransactionId,
        stkResponse.ResponseCode || "REQUEST_REJECTED",
        stkResponse.ResponseDescription || "M-Pesa did not accept the STK request",
      );
      throw new ValidationError(stkResponse.ResponseDescription || "M-Pesa STK request was not accepted");
    }

    try {
      await this.repository.completeMpesaStkInitiation(paymentTransactionId, {
        externalRequestId: stkResponse.CheckoutRequestID,
        merchantRequestId: stkResponse.MerchantRequestID,
        rawResponse: stkResponse,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.repository.markMpesaStkInitiationUncertain(paymentTransactionId, message, {
        externalRequestId: stkResponse.CheckoutRequestID,
        merchantRequestId: stkResponse.MerchantRequestID,
      });
      logger.error("M-Pesa accepted STK request but transaction update failed", {
        paymentTransactionId,
        orderNumber: order.orderNumber,
        checkoutRequestId: stkResponse.CheckoutRequestID,
        error: message,
      });
      throw new ValidationError("M-Pesa accepted the prompt, but we could not finish recording it. Do not retry; contact support with your order number.");
    }

    const result = {
      orderNumber: order.orderNumber,
      customerMessage: stkResponse.CustomerMessage,
      responseCode: stkResponse.ResponseCode,
      paymentStatus: "pending" as const,
    };

    return result;
  }

  private extractCallbackMetadata(payload: unknown) {
    const callback = payload as {
      Body?: {
        stkCallback?: {
          MerchantRequestID?: string;
          CheckoutRequestID?: string;
           ResultCode?: number | string | null;
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
      resultCode: normalizeDarajaCode(stkCallback?.ResultCode) ?? "-1",
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
    return getProviderAmount(metadataMap.get("Amount"));
  }

  private async queryMpesaStkStatus(checkoutRequestId: string): Promise<{ result: DarajaStkQueryResult; metadata: MpesaStkQueryMetadata }> {
    const startedAt = Date.now();
    logger.info("MPESA STK Query started", { checkoutRequestId });
    const accessToken = await this.getDarajaAccessToken();
    const timestamp = getTimestamp(new Date());
    const password = createDarajaPassword(env.MPESA_SHORTCODE, env.MPESA_PASSKEY, timestamp);

    try {
      const result = await this.darajaRequest<DarajaStkQueryResult>("/mpesa/stkpushquery/v1/query", {
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
      logger.info("MPESA STK Query completed", {
        checkoutRequestId,
        resultCode: result.ResultCode,
        durationMs: Date.now() - startedAt,
      });
      return {
        result,
        metadata: toMpesaStkQueryMetadata(result, new Date().toISOString()),
      };
    } catch (error) {
      logger.warn("MPESA STK Query failed", {
        checkoutRequestId,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
    queryMetadata?: MpesaStkQueryMetadata;
  }) {
    const now = new Date();
    const verificationStartedAt = Date.now();
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

      if (input.queryMetadata) {
        await this.repository.recordMpesaStkQueryMetadata(transaction.id, input.queryMetadata, tx);
      }

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
        const schedule = this.getAmbiguousReconciliationSchedule(transaction.reconciliationAttemptCount, now);
        await this.repository.markPaymentAmbiguous(transaction.id, {
          resultCode: input.resultCode,
          resultMessage: merchantMismatch ? "M-Pesa merchant request mismatch" : "M-Pesa provider account mismatch",
          rawCallback: input.rawCallback,
          nextReconciliationAt: schedule.nextAttemptAt,
          error: merchantMismatch ? "M-Pesa merchant request mismatch" : "M-Pesa provider account mismatch",
          manualReview: schedule.manualReview,
        }, tx);
        mappedStatus = "ambiguous";
        return;
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
        const duplicateReceipt = input.providerReceipt
          ? await tx.paymentTransaction.findFirst({
            where: {
              provider: PaymentProvider.MPESA,
              providerAccountKey: transaction.providerAccountKey,
              providerReceipt: input.providerReceipt,
              NOT: { id: transaction.id },
            },
            select: { id: true },
          })
          : null;
        if (duplicateReceipt) {
          const schedule = this.getAmbiguousReconciliationSchedule(transaction.reconciliationAttemptCount, now);
          await this.repository.markPaymentAmbiguous(transaction.id, {
            resultCode: input.resultCode,
            resultMessage: "Provider receipt is already linked to another payment",
            rawCallback: input.rawCallback,
            nextReconciliationAt: schedule.nextAttemptAt,
            error: "M-Pesa provider receipt is already linked to another payment",
            manualReview: true,
          }, tx);
          mappedStatus = "ambiguous";
          return;
        }

        const expectedAmount = Number(transaction.amount);
        const evidenceFailure = getPaymentEvidenceFailure({
          providerReceipt: input.providerReceipt,
          amount: input.amount,
          payerPhone: input.payerPhone,
          expectedAmount,
          expectedPhone: transaction.payerPhone,
        });
        if (evidenceFailure) {
          const schedule = this.getAmbiguousReconciliationSchedule(transaction.reconciliationAttemptCount, now);
          await this.repository.markPaymentAmbiguous(transaction.id, {
            resultCode: input.resultCode,
            resultMessage: evidenceFailure,
            rawCallback: input.rawCallback,
            nextReconciliationAt: schedule.nextAttemptAt,
            error: evidenceFailure,
            manualReview: schedule.manualReview,
          }, tx);
          mappedStatus = "ambiguous";
          return;
        }
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
          const schedule = this.getAmbiguousReconciliationSchedule(transaction.reconciliationAttemptCount, now);
          await this.repository.markPaymentAmbiguous(transaction.id, {
            resultCode: "LATE_PAYMENT_REVIEW",
            resultMessage: "Payment arrived after expiry grace window",
            rawCallback: input.rawCallback,
            nextReconciliationAt: schedule.nextAttemptAt,
            error: "Late M-Pesa success requires manual review",
            manualReview: true,
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
          const schedule = this.getAmbiguousReconciliationSchedule(transaction.reconciliationAttemptCount, now);
          await this.repository.markPaymentAmbiguous(transaction.id, {
            resultCode: input.resultCode,
            resultMessage: input.resultDesc,
            rawCallback: input.rawCallback,
            nextReconciliationAt: schedule.nextAttemptAt,
            error: "Provider returned a non-definitive result",
            manualReview: schedule.manualReview,
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
          const hasPendingManualProof = await this.repository.hasPendingPaymentProof(transaction.orderId, tx);
          const canRejectOrder = transaction.order.status === OrderStatus.PENDING_PAYMENT
            || (transaction.order.status === OrderStatus.PAYMENT_SUBMITTED && !hasPendingManualProof);
          if (canRejectOrder) {
            await this.repository.transitionOrderStatus(
              transaction.orderId,
              [OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_SUBMITTED],
              OrderStatus.PAYMENT_REJECTED,
              tx,
            );
          }
          mappedStatus = failureStatus === PaymentStatus.CANCELLED ? "cancelled" : "failed";
        }
      }
    });

    logger.info("MPESA payment verification committed", {
      checkoutRequestId: input.checkoutRequestId,
      status: mappedStatus,
      durationMs: Date.now() - verificationStartedAt,
    });

    return {
      orderNumber,
      status: mappedStatus,
      verifiedOrderId,
      resultCode: input.resultCode,
      resultDesc: input.resultDesc,
    };
  }

  async fulfillVerifiedOrder(orderId: string, timingContext?: { callbackInboxEventId?: string; checkoutRequestId?: string }) {
    const startedAt = Date.now();
    const tickets = await this.ticketsService.issueTicketsForOrder(orderId);
    logger.info("MPESA ticket issuance completed", {
      orderId,
      ticketsIssued: tickets.length,
      durationMs: Date.now() - startedAt,
      ...timingContext,
    });
    const paidUpdate = await this.repository.markOrderPaidAfterFulfillment(orderId, new Date());
    logger.info("MPESA order marked paid", {
      orderId,
      updatedRows: paidUpdate.count,
      durationMs: Date.now() - startedAt,
      ...timingContext,
    });
    return { ticketsIssued: tickets.length, ticketDeliveryStatus: "pending" as const };
  }

  private async processMpesaStkCallbackByCheckoutRequestId(checkoutRequestId: string, payload: unknown) {
    const extracted = this.extractCallbackMetadata(payload);
    if (extracted.checkoutRequestId !== checkoutRequestId) {
      throw new ValidationError("M-Pesa callback checkout request mismatch");
    }
    const mpesaReceipt = this.getCallbackReceipt(extracted.metadataMap);
    const callbackAmount = this.getCallbackAmount(extracted.metadataMap);
    const callbackPhone = this.getCallbackPhone(extracted.metadataMap);

    if (extracted.resultCode === "0") {
      const { result: verification, metadata: queryMetadata } = await this.queryMpesaStkStatus(checkoutRequestId);
      const queryCheckoutRequestId = normalizeDarajaText(verification.CheckoutRequestID);
      if (queryCheckoutRequestId && queryCheckoutRequestId !== checkoutRequestId) {
        logger.warn("MPESA STK query checkout request mismatch", {
          checkoutRequestId,
          receivedCheckoutRequestId: queryCheckoutRequestId,
        });
        throw new ValidationError("M-Pesa status query checkout request mismatch");
      }

      const result = await this.applyMpesaPaymentResult({
        checkoutRequestId,
        merchantRequestId: extracted.merchantRequestId,
        providerAccountKey: env.MPESA_SHORTCODE,
        resultCode: getQueryResultCode(verification) ?? "QUERY_RESULT_UNAVAILABLE",
        resultDesc: getQueryResultDescription(verification),
        externalTransactionId: mpesaReceipt,
        providerReceipt: mpesaReceipt,
        amount: callbackAmount,
        payerPhone: callbackPhone,
        queryMetadata,
        rawCallback: payload as Prisma.InputJsonValue,
      });
      if (!result.status) throw new ValidationError("M-Pesa transaction was not found for callback");
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
  }

  async ingestMpesaStkCallback(payload: unknown) {
    const extracted = this.extractCallbackMetadata(payload);
    if (!extracted.checkoutRequestId) {
      throw new ValidationError("M-Pesa callback is missing checkout request id");
    }

    const receivedAt = Date.now();
    const correlationId = randomUUID();
    logger.info("MPESA callback received", {
      correlationId,
      checkoutRequestId: extracted.checkoutRequestId,
      resultCode: extracted.resultCode,
    });
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
      correlationId,
    });

    logger.info("MPESA callback inbox event persisted", {
      callbackInboxEventId: inboxEvent?.id,
      correlationId,
      checkoutRequestId: extracted.checkoutRequestId,
      durationMs: Date.now() - receivedAt,
    });
    requestMpesaReconciliationWake();

    return { accepted: true, message: inboxEvent?.status === "PROCESSED" ? "already processed" : "accepted" };
  }

  async processCallbackInboxEvent(id: string) {
    const event = await this.repository.getCallbackInboxEvent(id);
    if (!event) throw new NotFoundError("Payment callback event not found");
    if (!event.checkoutRequestId) throw new ValidationError("Callback event has no checkout request id");

    const processingStartedAt = Date.now();
    logger.info("MPESA callback processing started", {
      callbackInboxEventId: id,
      checkoutRequestId: event.checkoutRequestId,
    });

    try {
      await this.processMpesaStkCallbackByCheckoutRequestId(event.checkoutRequestId, event.payload);
      const transaction = await this.repository.findPaymentTransactionByExternalRequestId(event.checkoutRequestId);
      if (transaction?.status === PaymentStatus.SUCCEEDED && transaction.order.status === OrderStatus.PAYMENT_VERIFIED) {
        await this.fulfillVerifiedOrder(transaction.order.id, {
          callbackInboxEventId: id,
          checkoutRequestId: event.checkoutRequestId,
        });
      }
      await this.repository.completeCallbackInboxEvent(id, transaction?.id);
      logger.info("MPESA callback processing completed", {
        callbackInboxEventId: id,
        checkoutRequestId: event.checkoutRequestId,
        paymentTransactionId: transaction?.id,
        durationMs: Date.now() - processingStartedAt,
      });
    } catch (error) {
      const rateLimited = error instanceof DarajaRequestError && error.providerStatus === 429;
      const attempts = event.attemptCount + (rateLimited ? 0 : 1);
      const backoffMinutes = [0.5, 2, 5, 15, 30, 60][Math.min(attempts - 1, 5)] ?? 60;
      const retryDelayMs = rateLimited ? (error.retryAfterMs ?? 5 * 60_000) : backoffMinutes * 60_000;
      await this.repository.failCallbackInboxEvent(id, {
        nextAttemptAt: new Date(Date.now() + retryDelayMs),
        error: error instanceof Error ? error.message : String(error),
        manualReview: !rateLimited && attempts >= env.MPESA_RECONCILIATION_MAX_ATTEMPTS,
        countAttempt: !rateLimited,
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

      const hasActiveMpesaPayment = order.paymentTransactions.some((payment) =>
        payment.provider === PaymentProvider.MPESA
        && (payment.status === PaymentStatus.INITIATED
          || payment.status === PaymentStatus.PENDING
          || payment.status === PaymentStatus.AMBIGUOUS),
      );
      if (hasActiveMpesaPayment) {
        throw new ValidationError("An M-Pesa payment is already being processed for this order.");
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

  async reverifyMpesaTransaction(
    id: string,
    options: { source?: "admin" | "worker" } = {},
  ): Promise<ReverifyMpesaTransactionResult> {
    const source = options.source ?? "admin";
    let transaction = await this.repository.findPaymentTransactionById(id);
    if (!transaction) {
      throw new NotFoundError("M-Pesa transaction not found");
    }
    if (transaction.provider !== "MPESA") {
      throw new ValidationError("Only M-Pesa transactions can be reverified");
    }
    if (!transaction.externalRequestId) {
      throw new ValidationError("M-Pesa transaction is missing a checkout request id");
    }

    if (source === "worker" && transaction.reconciliationRequiresManualReview) {
      return {
        orderNumber: transaction.order.orderNumber,
        status: this.mapPaymentStatusForAudit(transaction.status),
        resultCode: transaction.resultCode ?? undefined,
        resultDesc: transaction.resultMessage ?? undefined,
      };
    }

    if (transaction.status !== PaymentStatus.INITIATED && transaction.status !== PaymentStatus.PENDING && transaction.status !== PaymentStatus.AMBIGUOUS) {
      return {
        orderNumber: transaction.order.orderNumber,
        status: this.mapPaymentStatusForAudit(transaction.status),
        resultCode: transaction.resultCode ?? undefined,
        resultDesc: transaction.resultMessage ?? undefined,
      };
    }

    if (
      source === "admin"
      && transaction.nextReconciliationAt
      && transaction.nextReconciliationAt.getTime() > Date.now()
    ) {
      throw new ValidationError("M-Pesa re-verification is cooling down; try again later.");
    }

    let leaseOwner: string | undefined;
    if (source === "admin") {
      leaseOwner = `mpesa-admin-${randomUUID()}`;
      const claimed = await this.repository.claimMpesaTransaction(
        id,
        leaseOwner,
        new Date(),
        new Date(Date.now() + env.MPESA_RECONCILIATION_LEASE_SECONDS * 1000),
      );
      if (!claimed) {
        throw new ConflictError("M-Pesa verification is already being processed. Try again shortly.");
      }
      transaction = claimed;
    }

    const checkoutRequestId = transaction.externalRequestId;
    if (!checkoutRequestId) {
      throw new ValidationError("M-Pesa transaction is missing a checkout request id");
    }

    let result: Awaited<ReturnType<PaymentsService["applyMpesaPaymentResult"]>>;
    try {
      const { result: verification, metadata: queryMetadata } = await this.queryMpesaStkStatus(checkoutRequestId);
      const queryCheckoutRequestId = normalizeDarajaText(verification.CheckoutRequestID);
      if (queryCheckoutRequestId && queryCheckoutRequestId !== checkoutRequestId) {
        throw new ValidationError("M-Pesa status query checkout request mismatch");
      }
      result = await this.applyMpesaPaymentResult({
        checkoutRequestId,
        merchantRequestId: transaction.providerReference ?? undefined,
        providerAccountKey: env.MPESA_SHORTCODE,
        resultCode: getQueryResultCode(verification) ?? "QUERY_RESULT_UNAVAILABLE",
        resultDesc: getQueryResultDescription(verification),
        queryMetadata,
        providerReceipt: hasProviderValue(verification.MpesaReceiptNumber) ? String(verification.MpesaReceiptNumber).trim() : undefined,
        externalTransactionId: hasProviderValue(verification.MpesaReceiptNumber) ? String(verification.MpesaReceiptNumber).trim() : undefined,
        amount: getProviderAmount(verification.Amount),
        payerPhone: getProviderPhone(verification.PhoneNumber),
        rawCallback: (transaction.rawCallback ?? {
          source: "admin-mpesa-reverify",
          queriedAt: queryMetadata.queriedAt,
        }) as Prisma.InputJsonValue,
      });
    } catch (error) {
      if (source === "admin") {
        const rateLimited = error instanceof DarajaRequestError && error.providerStatus === 429;
        const schedule = this.getAmbiguousReconciliationSchedule(
          transaction.reconciliationAttemptCount,
          new Date(),
          rateLimited ? (error.retryAfterMs ?? 5 * 60_000) : undefined,
        );
        await this.repository.recordReconciliationFailure(id, {
          nextAttemptAt: schedule.nextAttemptAt,
          error: error instanceof Error ? error.message : String(error),
          manualReview: schedule.manualReview,
          countAttempt: true,
          leaseOwner,
        });
      }
      throw error;
    } finally {
      if (leaseOwner) await this.repository.releaseReconciliationLease(id, leaseOwner);
    }

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
      reconciliationAttemptCount: row.reconciliationAttemptCount,
      reconciliationRequiresManualReview: row.reconciliationRequiresManualReview,
      lastReconciliationError: row.lastReconciliationError ?? undefined,
      initiatedAt: row.initiatedAt.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      callbackReceived: Boolean(row.rawCallback),
      rawCallback: row.rawCallback ?? undefined,
    }));
  }
}
