import { UserRole } from "@prisma/client";
import { isIP } from "node:net";
import { isAbsolute } from "node:path";
import { z } from "zod";

const SANDBOX_SHORTCODE = "174379";

const booleanEnv = z.preprocess((value) => {
  if (typeof value !== "string") return value;

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off", ""].includes(normalized)) return false;

  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative().default(0),
  SERVE_FRONTEND: booleanEnv.default(false),
  API_PREFIX: z.string().default("/api"),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:8080"),
  PUBLIC_API_URL: z.string().url().or(z.literal("")).default(""),
  CORS_ORIGIN: z.string().default("http://localhost:8080"),
  CORS_ALLOW_ALL_IN_DEV: booleanEnv.default(false),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  SESSION_COOKIE_NAME: z.string().default("agi_admin_session"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24 * 7),
  SESSION_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  SESSION_COOKIE_SECURE: booleanEnv.default(false),
  SESSION_COOKIE_DOMAIN: z.string().optional(),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  MEDIA_LOCAL_ROOT: z.string().default("./storage/media"),
  MEDIA_PUBLIC_BASE_PATH: z.string().default("/media/files"),
  ORDER_RESERVATION_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  BACKUP_OUTPUT_DIR: z.string().default(""),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().nonnegative().default(30),
  EMAIL_DELIVERY_ENABLED: booleanEnv.default(false),
  EMAIL_ATTACH_TICKET_PDFS: booleanEnv.default(true),
  EMAIL_DELIVERY_RETRY_ENABLED: booleanEnv.default(true),
  EMAIL_DELIVERY_RETRY_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  EMAIL_DELIVERY_RETRY_SWEEP_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60),
  EMAIL_DELIVERY_RETRY_BATCH_SIZE: z.coerce.number().int().positive().max(100).default(20),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanEnv.default(false),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  EMAIL_FROM: z.string().default(""),
  EMAIL_REPLY_TO: z.string().default(""),
  MPESA_DARAJA_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  MPESA_LIVE_PAYMENTS_ENABLED: booleanEnv.default(false),
  MPESA_SHORTCODE: z.string().default(""),
  MPESA_ACCOUNT_NUMBER: z.string().default(""),
  MPESA_BUSINESS_NAME: z.string().default("THE ART GALORE INTERNATIONAL"),
  MPESA_PASSKEY: z.string().default(""),
  MPESA_CONSUMER_KEY: z.string().default(""),
  MPESA_CONSUMER_SECRET: z.string().default(""),
  MPESA_CALLBACK_URL: z.string().url().or(z.literal("")).default(""),
  MPESA_CALLBACK_ALLOWED_IPS: z.string().default(""),
  MPESA_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(30),
  MPESA_STK_INITIATE_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(30),
  MPESA_STK_PENDING_RETRY_MINUTES: z.coerce.number().int().positive().default(5),
  MPESA_LATE_PAYMENT_POLICY: z.enum(["reject", "accept_with_grace", "manual_review"]).default("reject"),
  MPESA_LATE_PAYMENT_GRACE_MINUTES: z.coerce.number().int().nonnegative().default(10),
  MPESA_RECONCILIATION_ENABLED: booleanEnv.default(true),
  MPESA_RECONCILIATION_INTERVAL_SECONDS: z.coerce.number().int().positive().default(30),
  MPESA_RECONCILIATION_MAX_ATTEMPTS: z.coerce.number().int().positive().default(8),
  MPESA_RECONCILIATION_LEASE_SECONDS: z.coerce.number().int().positive().default(120),
  ORDER_EXPIRY_SWEEP_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60),
  SEED_ADMIN_ENABLED: booleanEnv.default(true),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@local.test"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!"),
  SEED_ADMIN_FULL_NAME: z.string().min(2).default("Local Admin"),
  SEED_ADMIN_ROLE: z.nativeEnum(UserRole).default(UserRole.ADMIN),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const errors = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid backend environment configuration: ${errors}`);
}

const parsed = parsedEnv.data;

function isUnsafePublicHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".test") ||
    normalized.endsWith(".ngrok-free.dev") ||
    normalized.endsWith(".ngrok-free.app") ||
    normalized.endsWith(".ngrok.io") ||
    normalized.endsWith(".loca.lt") ||
    normalized.endsWith(".localtunnel.me") ||
    normalized.endsWith(".trycloudflare.com")
  );
}

function assertProductionPublicUrl(value: string, name: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid backend environment configuration: ${name} must be a valid HTTPS URL in production`);
  }

  if (url.protocol !== "https:" || isUnsafePublicHostname(url.hostname)) {
    throw new Error(`Invalid backend environment configuration: ${name} must be a public HTTPS URL in production`);
  }
}

function assertProductionCorsOrigins(value: string) {
  const origins = value.split(",").map((origin) => origin.trim()).filter(Boolean);

  if (origins.length === 0) {
    throw new Error("Invalid backend environment configuration: CORS_ORIGIN must contain at least one production origin");
  }

  for (const origin of origins) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error("Invalid backend environment configuration: CORS_ORIGIN contains an invalid origin");
    }

    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || isUnsafePublicHostname(url.hostname)) {
      throw new Error("Invalid backend environment configuration: CORS_ORIGIN must contain public HTTPS origins only");
    }
  }
}

if (parsed.MPESA_DARAJA_ENV === "production" && !parsed.MPESA_LIVE_PAYMENTS_ENABLED) {
  throw new Error("Invalid backend environment configuration: production Daraja is blocked unless MPESA_LIVE_PAYMENTS_ENABLED=true");
}

if (parsed.MPESA_LIVE_PAYMENTS_ENABLED && parsed.MPESA_DARAJA_ENV !== "production") {
  throw new Error("Invalid backend environment configuration: MPESA_LIVE_PAYMENTS_ENABLED requires MPESA_DARAJA_ENV=production");
}

if (parsed.MPESA_DARAJA_ENV === "sandbox") {
  if (parsed.MPESA_SHORTCODE && parsed.MPESA_SHORTCODE !== SANDBOX_SHORTCODE) {
    throw new Error(`Invalid backend environment configuration: sandbox MPESA_SHORTCODE must be ${SANDBOX_SHORTCODE}`);
  }
}

if (parsed.EMAIL_DELIVERY_ENABLED) {
  if (!parsed.SMTP_HOST) {
    throw new Error("Invalid backend environment configuration: SMTP_HOST is required when email delivery is enabled");
  }
  if (!parsed.EMAIL_FROM) {
    throw new Error("Invalid backend environment configuration: EMAIL_FROM is required when email delivery is enabled");
  }
  if (Boolean(parsed.SMTP_USER) !== Boolean(parsed.SMTP_PASSWORD)) {
    throw new Error("Invalid backend environment configuration: SMTP_USER and SMTP_PASSWORD must be provided together");
  }
}

const mpesaCallbackAllowedIps = parsed.MPESA_CALLBACK_ALLOWED_IPS.split(",").map((ip) => ip.trim()).filter(Boolean);
if (mpesaCallbackAllowedIps.some((ip) => isIP(ip) === 0)) {
  throw new Error("Invalid backend environment configuration: MPESA_CALLBACK_ALLOWED_IPS must contain comma-separated IPv4 or IPv6 addresses");
}

if (parsed.NODE_ENV === "production" && parsed.MPESA_CALLBACK_URL) {
  assertProductionPublicUrl(parsed.MPESA_CALLBACK_URL, "MPESA_CALLBACK_URL");
  if (mpesaCallbackAllowedIps.length === 0) {
    throw new Error("Invalid backend environment configuration: MPESA_CALLBACK_ALLOWED_IPS must be configured from the current Safaricom callback IP allowlist");
  }
}

if (parsed.MPESA_LIVE_PAYMENTS_ENABLED) {
  const missingCredentials = [
    parsed.MPESA_CALLBACK_URL,
    parsed.MPESA_SHORTCODE,
    parsed.MPESA_PASSKEY,
    parsed.MPESA_CONSUMER_KEY,
    parsed.MPESA_CONSUMER_SECRET,
  ].some((value) => !value.trim());
  if (missingCredentials || mpesaCallbackAllowedIps.length === 0 || !parsed.MPESA_RECONCILIATION_ENABLED) {
    throw new Error("Invalid backend environment configuration: live M-Pesa requires callback URL, callback IP allowlist, Daraja credentials, and reconciliation enabled");
  }
}

if (parsed.NODE_ENV === "production") {
  if (parsed.SERVE_FRONTEND) {
    throw new Error("Invalid backend environment configuration: SERVE_FRONTEND must be false for the separated Vercel/VPS deployment");
  }

  if (!parsed.PUBLIC_API_URL) {
    throw new Error("Invalid backend environment configuration: PUBLIC_API_URL is required in production");
  }

  assertProductionPublicUrl(parsed.PUBLIC_APP_URL, "PUBLIC_APP_URL");
  assertProductionPublicUrl(parsed.PUBLIC_API_URL, "PUBLIC_API_URL");
  assertProductionCorsOrigins(parsed.CORS_ORIGIN);

  if (!parsed.SESSION_COOKIE_SECURE) {
    throw new Error("Invalid backend environment configuration: SESSION_COOKIE_SECURE must be true in production");
  }

  if (parsed.SEED_ADMIN_ENABLED) {
    throw new Error("Invalid backend environment configuration: SEED_ADMIN_ENABLED must be false in production");
  }

  if (parsed.TRUST_PROXY_HOPS !== 1) {
    throw new Error("Invalid backend environment configuration: TRUST_PROXY_HOPS must be 1 for the documented single reverse-proxy deployment");
  }

  if (parsed.STORAGE_PROVIDER === "local" && !isAbsolute(parsed.MEDIA_LOCAL_ROOT)) {
    throw new Error("Invalid backend environment configuration: MEDIA_LOCAL_ROOT must be an absolute persistent path in production");
  }

  const jwtSecrets = [parsed.JWT_ACCESS_SECRET, parsed.JWT_REFRESH_SECRET];
  const hasUnsafeJwtSecret = jwtSecrets.some((secret) =>
    secret.trim().length < 32
    || /[<>]/.test(secret)
    || /(?:replace[-_ ]?with|change[-_ ]?me)/i.test(secret)
    || /^(?:dev|local|test|example)[-_ ]/i.test(secret),
  );
  if (hasUnsafeJwtSecret || jwtSecrets[0] === jwtSecrets[1]) {
    throw new Error("Invalid backend environment configuration: production JWT secrets must be distinct, at least 32 characters, and contain no template or development placeholders");
  }
}

export const env = parsed;
