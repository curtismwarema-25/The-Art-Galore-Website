import { UserRole } from "@prisma/client";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default("/api"),
  CORS_ORIGIN: z.string().default("http://localhost:8080"),
  CORS_ALLOW_ALL_IN_DEV: z.coerce.boolean().default(false),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  SESSION_COOKIE_NAME: z.string().default("agi_admin_session"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24 * 7),
  SESSION_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  SESSION_COOKIE_SECURE: z.coerce.boolean().default(false),
  SESSION_COOKIE_DOMAIN: z.string().optional(),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  MEDIA_LOCAL_ROOT: z.string().default("./storage/media"),
  MEDIA_PUBLIC_BASE_PATH: z.string().default("/media/files"),
  ORDER_RESERVATION_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  MPESA_DARAJA_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  MPESA_SHORTCODE: z.string().default(""),
  MPESA_PASSKEY: z.string().default(""),
  MPESA_CONSUMER_KEY: z.string().default(""),
  MPESA_CONSUMER_SECRET: z.string().default(""),
  MPESA_CALLBACK_URL: z.string().url().or(z.literal("")).default(""),
  MPESA_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(30),
  MPESA_STK_INITIATE_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(30),
  MPESA_STK_PENDING_RETRY_MINUTES: z.coerce.number().int().positive().default(5),
  MPESA_LATE_PAYMENT_POLICY: z.enum(["reject", "accept_with_grace", "manual_review"]).default("reject"),
  MPESA_LATE_PAYMENT_GRACE_MINUTES: z.coerce.number().int().nonnegative().default(10),
  ORDER_EXPIRY_SWEEP_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60),
  SEED_ADMIN_ENABLED: z.coerce.boolean().default(true),
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

export const env = parsedEnv.data;
