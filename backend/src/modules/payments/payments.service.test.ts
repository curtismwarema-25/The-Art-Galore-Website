import { OrderStatus, PaymentStatus } from "@prisma/client";
import assert from "node:assert/strict";
import test from "node:test";
import { env } from "../../config/index.js";
import { assertScreenshotAsset, DarajaRequestError, getQueryResultCode, getQueryResultDescription, normalizeDarajaCode, PaymentsService, toMpesaStkQueryMetadata } from "./payments.service.js";
import { getMpesaReconciliationSchedule } from "./mpesaReconciliationPolicy.js";
import { registerMpesaReconciliationWakeListener } from "./mpesaReconciliationSignal.js";

function createServiceForPureTests() {
  return new PaymentsService({} as never, {} as never) as unknown as {
    shouldAcceptLateSuccess: (orderStatus: OrderStatus, reservationExpiresAt: Date, now: Date) => { accept: boolean; review: boolean };
    extractCallbackMetadata: (payload: unknown) => {
      merchantRequestId?: string;
      checkoutRequestId?: string;
      resultCode: string;
      resultDesc: string;
      metadataMap: Map<string, string | number | undefined>;
    };
    getDarajaAccessToken: () => Promise<string>;
    darajaRequest: <T>(path: string, init: RequestInit) => Promise<T>;
    classifyProviderFailure: (resultCode: string) => PaymentStatus;
  };
}

function preserveDarajaConfig() {
  const names = [
    "MPESA_DARAJA_ENV",
    "MPESA_LIVE_PAYMENTS_ENABLED",
    "MPESA_CONSUMER_KEY",
    "MPESA_CONSUMER_SECRET",
    "MPESA_SHORTCODE",
    "MPESA_PASSKEY",
    "MPESA_CALLBACK_URL",
  ] as const;
  const previous = Object.fromEntries(names.map((name) => [name, env[name]]));
  return () => Object.assign(env, previous);
}

function setTestDarajaConfig() {
  Object.assign(env, {
    MPESA_DARAJA_ENV: "sandbox",
    MPESA_LIVE_PAYMENTS_ENABLED: false,
    MPESA_CONSUMER_KEY: "test-consumer-key",
    MPESA_CONSUMER_SECRET: "test-consumer-secret",
    MPESA_SHORTCODE: "174379",
    MPESA_PASSKEY: "test-passkey",
    MPESA_CALLBACK_URL: "https://example.test/api/payments/mpesa/stk/callback",
  });
}

test("expired late M-Pesa success is accepted within the grace window", () => {
  const service = createServiceForPureTests();
  const now = new Date("2026-05-26T12:05:00.000Z");
  const expiredAt = new Date("2026-05-26T12:00:00.000Z");

  assert.deepEqual(service.shouldAcceptLateSuccess(OrderStatus.EXPIRED, expiredAt, now), {
    accept: true,
    review: false,
  });
});

test("non-expired M-Pesa success remains acceptable", () => {
  const service = createServiceForPureTests();
  const now = new Date("2026-05-26T12:10:00.000Z");
  const futureExpiry = new Date("2026-05-26T12:30:00.000Z");

  assert.deepEqual(service.shouldAcceptLateSuccess(OrderStatus.PENDING_PAYMENT, futureExpiry, now), {
    accept: true,
    review: false,
  });
});

test("STK query metadata keeps provider outcomes sanitized and UTC-dated", () => {
  const metadata = toMpesaStkQueryMetadata({
    ResponseCode: "0",
    ResponseDescription: "The service request is processed successfully.",
    ResultCode: "0",
    ResultDesc: "The service request is processed successfully.",
    CheckoutRequestID: "ws_CO_test",
    MpesaReceiptNumber: "SECRET-RECEIPT",
  }, "2026-11-12T12:00:00.000Z");

  assert.deepEqual(metadata, {
    ResponseCode: "0",
    ResponseDescription: "The service request is processed successfully.",
    ResultCode: "0",
    ResultDesc: "The service request is processed successfully.",
    CheckoutRequestID: "ws_CO_test",
    receiptPresent: true,
    queriedAt: "2026-11-12T12:00:00.000Z",
  });
  assert.equal("SECRET-RECEIPT" in metadata, false);
});

test("STK query success without receipt remains evidence-incomplete", () => {
  const result = {
    ResponseCode: "0",
    ResponseDescription: "The service request is processed successfully.",
    ResultCode: "0",
    ResultDesc: "The service request is processed successfully.",
    CheckoutRequestID: "checkout-test",
  };

  assert.equal(getQueryResultCode(result), "0");
  assert.equal(getQueryResultDescription(result), result.ResultDesc);
  assert.equal(toMpesaStkQueryMetadata(result, "2026-11-12T12:00:00.000Z").receiptPresent, false);
});

test("STK query response code without a result code is not treated as a payment result", () => {
  assert.equal(getQueryResultCode({ ResponseCode: "0" }), undefined);
  assert.equal(getQueryResultDescription({ ResponseCode: "0" }), "M-Pesa query did not return a transaction result");
});

test("failed, malformed, and provider-error query outcomes remain non-successful", () => {
  assert.equal(getQueryResultCode({ ResponseCode: "0", ResultCode: "1032" }), "1032");
  assert.equal(getQueryResultCode({ ResponseCode: "bad", ResultCode: "0" }), undefined);
  assert.equal(getQueryResultCode({ ResponseCode: "500", ResultCode: "0" }), undefined);
});
test("ambiguous reconciliation uses exponential backoff and caps at manual review", () => {
  const now = new Date("2026-11-12T12:00:00.000Z");
  assert.equal(getMpesaReconciliationSchedule({ attemptCount: 0, maxAttempts: 8, now }).nextAttemptAt?.toISOString(), "2026-11-12T12:01:00.000Z");
  assert.equal(getMpesaReconciliationSchedule({ attemptCount: 6, maxAttempts: 8, now }).nextAttemptAt?.toISOString(), "2026-11-12T13:00:00.000Z");
  assert.deepEqual(getMpesaReconciliationSchedule({ attemptCount: 7, maxAttempts: 8, now }), {
    attemptNumber: 8,
    manualReview: true,
  });
  assert.equal(getMpesaReconciliationSchedule({ attemptCount: 0, maxAttempts: 8, now, retryAfterMs: 90_000 }).nextAttemptAt?.toISOString(), "2026-11-12T12:01:30.000Z");
});

test("provider cancellation and timeout are terminal failures while unknown results remain ambiguous", () => {
  const service = createServiceForPureTests();
  assert.equal(service.classifyProviderFailure("1032"), PaymentStatus.CANCELLED);
  assert.equal(service.classifyProviderFailure("1037"), PaymentStatus.FAILED);
  assert.equal(service.classifyProviderFailure("9999"), PaymentStatus.AMBIGUOUS);
});

test("Daraja numeric and string result codes normalize identically", () => {
  const service = createServiceForPureTests();
  for (const value of [0, "0"] as const) {
    const normalized = normalizeDarajaCode(value);
    assert.equal(normalized, "0");
    assert.equal(service.classifyProviderFailure(normalized!), PaymentStatus.AMBIGUOUS, "success is handled only after evidence validation");
  }
  for (const value of [1032, "1032"] as const) {
    assert.equal(service.classifyProviderFailure(normalizeDarajaCode(value)!), PaymentStatus.CANCELLED);
  }
  for (const value of [1037, "1037", 2001, "2001"] as const) {
    assert.equal(service.classifyProviderFailure(normalizeDarajaCode(value)!), PaymentStatus.FAILED);
  }
  assert.equal(normalizeDarajaCode(null), undefined);
  assert.equal(normalizeDarajaCode({}), undefined);
});

test("callback metadata extraction reads checkout, merchant, result, and receipt", () => {
  const service = createServiceForPureTests();
  const result = service.extractCallbackMetadata({
    Body: {
      stkCallback: {
        MerchantRequestID: "merchant-123",
        CheckoutRequestID: "checkout-456",
        ResultCode: 0,
        ResultDesc: "Success",
        CallbackMetadata: {
          Item: [{ Name: "MpesaReceiptNumber", Value: "ABC123" }],
        },
      },
    },
  });

  assert.equal(result.merchantRequestId, "merchant-123");
  assert.equal(result.checkoutRequestId, "checkout-456");
  assert.equal(result.resultCode, "0");
  assert.equal(result.resultDesc, "Success");
  assert.equal(result.metadataMap.get("MpesaReceiptNumber"), "ABC123");
});

test("payment-proof validation rejects external or mismatched media URLs", () => {
  const baseAsset = {
    storageKey: "payment-proof/2026/09/proof.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
  };

  const expectedRelativeUrl = `${env.API_PREFIX.replace(/\/+$/g, "")}/${env.MEDIA_PUBLIC_BASE_PATH.replace(/^\/+|\/+$/g, "")}/${baseAsset.storageKey}`;
  assert.doesNotThrow(() => assertScreenshotAsset({ ...baseAsset, url: expectedRelativeUrl }));
  assert.throws(() => assertScreenshotAsset({ ...baseAsset, url: "https://attacker.example/payment-proof/2026/09/proof.jpg" }));
  assert.throws(() => assertScreenshotAsset({ ...baseAsset, url: "/api/media/files/payment-proof/other.jpg" }));
});

test("Daraja OAuth uses the sandbox GET contract and caches a valid token", async () => {
  const restoreConfig = preserveDarajaConfig();
  const originalFetch = globalThis.fetch;
  const service = createServiceForPureTests();
  let fetchCount = 0;
  let observedUrl = "";
  let observedInit: RequestInit | undefined;

  setTestDarajaConfig();
  globalThis.fetch = async (input, init) => {
    fetchCount += 1;
    observedUrl = String(input);
    observedInit = init;
    return new Response(JSON.stringify({ access_token: "test-access-token", expires_in: "3600" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    assert.equal(await service.getDarajaAccessToken(), "test-access-token");
    assert.equal(await service.getDarajaAccessToken(), "test-access-token");
    assert.equal(fetchCount, 1);
    assert.equal(observedUrl, "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials");
    assert.equal(observedInit?.method, "GET");
    const headers = new Headers(observedInit?.headers);
    assert.equal(headers.get("Accept"), "application/json");
    assert.equal(headers.get("Authorization"), `Basic ${Buffer.from("test-consumer-key:test-consumer-secret").toString("base64")}`);
  } finally {
    globalThis.fetch = originalFetch;
    restoreConfig();
  }
});

test("Daraja OAuth rejects missing credentials before making a request", async () => {
  const restoreConfig = preserveDarajaConfig();
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  setTestDarajaConfig();
  env.MPESA_CONSUMER_SECRET = "";
  globalThis.fetch = async () => {
    fetchCount += 1;
    return new Response("unexpected");
  };

  try {
    await assert.rejects(
      () => createServiceForPureTests().getDarajaAccessToken(),
      /M-Pesa STK is not configured on the server/,
    );
    assert.equal(fetchCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
    restoreConfig();
  }
});

test("Daraja OAuth preserves an empty HTTP error as a diagnosable provider failure without retrying", async () => {
  const restoreConfig = preserveDarajaConfig();
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  setTestDarajaConfig();
  globalThis.fetch = async () => {
    fetchCount += 1;
    return new Response("", {
      status: 400,
      headers: { "content-type": "text/plain" },
    });
  };

  try {
    await assert.rejects(
      () => createServiceForPureTests().getDarajaAccessToken(),
      /Daraja returned an empty response \(HTTP 400\)/,
    );
    assert.equal(fetchCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
    restoreConfig();
  }
});

test("Daraja rate limits expose a bounded Retry-After delay", async () => {
  const restoreConfig = preserveDarajaConfig();
  const originalFetch = globalThis.fetch;
  const service = createServiceForPureTests();
  setTestDarajaConfig();
  globalThis.fetch = async () => new Response(JSON.stringify({ errorCode: "429", errorMessage: "Too many requests" }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": "90" },
  });

  try {
    await assert.rejects(
      () => service.darajaRequest("/mpesa/stkpushquery/v1/query", { method: "POST" }),
      (error: unknown) => error instanceof DarajaRequestError
        && error.providerStatus === 429
        && error.retryAfterMs === 90_000,
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreConfig();
  }
});

test("callback processing owns successful fulfilment exactly once", async () => {
  let fulfilmentCount = 0;
  const repository = {
    getCallbackInboxEvent: async () => ({
      id: "callback-1",
      checkoutRequestId: "checkout-1",
      payload: {},
      attemptCount: 0,
    }),
    findPaymentTransactionByExternalRequestId: async () => ({
      id: "payment-1",
      status: PaymentStatus.SUCCEEDED,
      order: { id: "order-1", status: OrderStatus.PAYMENT_VERIFIED },
    }),
    completeCallbackInboxEvent: async () => undefined,
  };
  const service = new PaymentsService(repository as never, {} as never);

  (service as any).processMpesaStkCallbackByCheckoutRequestId = async () => undefined;
  (service as any).fulfillVerifiedOrder = async () => {
    fulfilmentCount += 1;
    return { ticketsIssued: 1, ticketDeliveryStatus: "pending" };
  };

  await service.processCallbackInboxEvent("callback-1");

  assert.equal(fulfilmentCount, 1);
});

test("callback ingestion wakes reconciliation only after inbox persistence", async () => {
  let persisted = false;
  let wakeCount = 0;
  const repository = {
    createCallbackInboxEvent: async () => {
      persisted = true;
      return { id: "callback-1", status: "PENDING" };
    },
  };
  const service = new PaymentsService(repository as never, {} as never);
  const unregister = registerMpesaReconciliationWakeListener(() => {
    assert.equal(persisted, true);
    wakeCount += 1;
  });

  try {
    await service.ingestMpesaStkCallback({
      Body: {
        stkCallback: {
          CheckoutRequestID: "checkout-1",
          ResultCode: 0,
          ResultDesc: "Success",
        },
      },
    });
  } finally {
    unregister();
  }

  assert.equal(wakeCount, 1);
});

test("simultaneous admin re-verification uses one database lease and one query", async () => {
  let claimed = false;
  let queryCount = 0;
  let releaseCount = 0;
  const transaction = {
    id: "payment-1",
    provider: "MPESA",
    externalRequestId: "checkout-1",
    providerReference: "merchant-1",
    status: PaymentStatus.AMBIGUOUS,
    reconciliationRequiresManualReview: false,
    nextReconciliationAt: null,
    reconciliationAttemptCount: 0,
    resultCode: "9999",
    resultMessage: "Still processing",
    rawCallback: null,
    amount: 100,
    payerPhone: "254700000000",
    order: { orderNumber: "ORD-1", status: OrderStatus.PENDING_PAYMENT },
  };
  const repository = {
    findPaymentTransactionById: async () => transaction,
    claimMpesaTransaction: async (_id: string, _owner: string, _now: Date, _leaseUntil: Date) => {
      if (claimed) return null;
      claimed = true;
      return transaction;
    },
    releaseReconciliationLease: async () => { releaseCount += 1; },
  };
  const service = new PaymentsService(repository as never, {} as never) as any;
  service.queryMpesaStkStatus = async () => {
    queryCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return {
      result: { ResponseCode: "0", ResultCode: "9999", ResultDesc: "Still processing", CheckoutRequestID: "checkout-1" },
      metadata: toMpesaStkQueryMetadata({ ResponseCode: "0", ResultCode: "9999", ResultDesc: "Still processing", CheckoutRequestID: "checkout-1" }, new Date().toISOString()),
    };
  };
  service.applyMpesaPaymentResult = async () => ({ orderNumber: "ORD-1", status: "ambiguous", resultCode: "9999", resultDesc: "Still processing" });

  const outcomes = await Promise.allSettled([
    service.reverifyMpesaTransaction("payment-1"),
    service.reverifyMpesaTransaction("payment-1"),
  ]);

  assert.equal(queryCount, 1);
  assert.equal(releaseCount, 1);
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter((outcome) => outcome.status === "rejected" && /already being processed/i.test(String(outcome.reason?.message))).length, 1);
});

test("admin lease releases after a provider failure", async () => {
  let releasedOwner = "";
  let recordedOwner = "";
  const transaction = {
    id: "payment-1",
    provider: "MPESA",
    externalRequestId: "checkout-1",
    providerReference: "merchant-1",
    status: PaymentStatus.PENDING,
    reconciliationRequiresManualReview: false,
    nextReconciliationAt: null,
    reconciliationAttemptCount: 0,
    resultCode: null,
    resultMessage: null,
    rawCallback: null,
    amount: 100,
    payerPhone: "254700000000",
    order: { orderNumber: "ORD-1", status: OrderStatus.PENDING_PAYMENT },
  };
  const repository = {
    findPaymentTransactionById: async () => transaction,
    claimMpesaTransaction: async (_id: string, owner: string) => {
      recordedOwner = owner;
      return transaction;
    },
    recordReconciliationFailure: async (_id: string, input: { leaseOwner?: string }) => {
      assert.equal(input.leaseOwner, recordedOwner);
      return { count: 1 };
    },
    releaseReconciliationLease: async (_id: string, owner?: string) => { releasedOwner = owner ?? ""; },
  };
  const service = new PaymentsService(repository as never, {} as never) as any;
  service.queryMpesaStkStatus = async () => { throw new DarajaRequestError(500, "provider failure"); };

  await assert.rejects(() => service.reverifyMpesaTransaction("payment-1"), /provider failure/i);
  assert.equal(releasedOwner, recordedOwner);
});
