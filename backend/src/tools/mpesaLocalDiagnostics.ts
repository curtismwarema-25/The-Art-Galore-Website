import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/index.js";

const callbackBasePath = `${env.API_PREFIX.replace(/\/+$/g, "")}/payments/mpesa/stk/callback`;

function callbackSummary() {
  if (!env.MPESA_CALLBACK_URL) return { configured: false };

  const url = new URL(env.MPESA_CALLBACK_URL);
  const expectedPath = env.MPESA_CALLBACK_PATH_TOKEN
    ? `${callbackBasePath}/${env.MPESA_CALLBACK_PATH_TOKEN}`
    : callbackBasePath;
  return {
    configured: true,
    scheme: url.protocol.replace(":", ""),
    host: url.hostname,
    pathMatchesRoute: url.pathname === expectedPath,
    queryPresent: Boolean(url.search),
    tokenized: Boolean(env.MPESA_CALLBACK_PATH_TOKEN),
    authenticationConfigured: Boolean(env.MPESA_CALLBACK_PATH_TOKEN || env.MPESA_CALLBACK_SECRET),
  };
}

async function probeCallback() {
  if (!env.MPESA_CALLBACK_URL) return { status: "not-run", reason: "callback URL is not configured" };

  // Never send a callback secret in a diagnostic request. GET is deliberately
  // used because the callback is POST-only; any HTTP response proves only that
  // the URL is reachable, not that a provider callback would be accepted.
  const url = new URL(env.MPESA_CALLBACK_URL);
  url.search = "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { method: "GET", redirect: "manual", signal: controller.signal });
    return {
      status: "reachable",
      httpStatus: response.status,
      postOnlyNote: "GET response does not validate provider POST callback delivery",
    };
  } catch (error) {
    return { status: "unreachable", error: error instanceof Error ? error.message : "network error" };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (env.MPESA_DARAJA_ENV !== "sandbox" || env.MPESA_LIVE_PAYMENTS_ENABLED) {
    errors.push("local diagnostics require MPESA_DARAJA_ENV=sandbox and MPESA_LIVE_PAYMENTS_ENABLED=false");
  }
  for (const [name, value] of [
    ["MPESA_CONSUMER_KEY", env.MPESA_CONSUMER_KEY],
    ["MPESA_CONSUMER_SECRET", env.MPESA_CONSUMER_SECRET],
    ["MPESA_PASSKEY", env.MPESA_PASSKEY],
    ["MPESA_CALLBACK_URL", env.MPESA_CALLBACK_URL],
  ] as const) {
    if (!value.trim()) errors.push(`${name} is not configured`);
  }

  const callback = callbackSummary();
  if (callback.configured && !callback.pathMatchesRoute) errors.push("callback URL does not match the registered callback route");
  if (callback.configured && callback.scheme !== "https") warnings.push("callback URL is not HTTPS; external Daraja delivery will not be reliable");
  if (env.EMAIL_DELIVERY_ENABLED && (!env.SMTP_HOST || !env.EMAIL_FROM)) errors.push("email delivery is enabled without complete SMTP/sender configuration");
  if (!env.EMAIL_DELIVERY_ENABLED) warnings.push("email delivery is disabled; ticket issuance can be tested without sending email");

  let database = "failed";
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch (error) {
    errors.push(`database connectivity failed: ${error instanceof Error ? error.message : "unknown error"}`);
  } finally {
    await prisma.$disconnect();
  }

  const callbackProbe = await probeCallback();
  if (callbackProbe.status === "unreachable") warnings.push(`callback reachability probe failed: ${callbackProbe.error}`);

  console.log(JSON.stringify({
    daraja: {
      environment: env.MPESA_DARAJA_ENV,
      livePaymentsEnabled: env.MPESA_LIVE_PAYMENTS_ENABLED,
      endpointHost: "sandbox.safaricom.co.ke",
      stkPushPath: "/mpesa/stkpush/v1/processrequest",
      stkQueryPath: "/mpesa/stkpushquery/v1/query",
    },
    backend: {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      database,
      reconciliationEnabled: env.MPESA_RECONCILIATION_ENABLED,
      reconciliationIntervalSeconds: env.MPESA_RECONCILIATION_INTERVAL_SECONDS,
      reconciliationMaxAttempts: env.MPESA_RECONCILIATION_MAX_ATTEMPTS,
    },
    callback,
    callbackProbe,
    email: {
      deliveryEnabled: env.EMAIL_DELIVERY_ENABLED,
      retryEnabled: env.EMAIL_DELIVERY_RETRY_ENABLED,
      smtpConfigured: Boolean(env.SMTP_HOST && env.EMAIL_FROM),
    },
    errors,
    warnings,
  }, null, 2));

  process.exitCode = errors.length > 0 ? 1 : 0;
}

void main();
