import { createHash } from "node:crypto";

const identifierKeys = /checkoutRequestId|externalRequestId|merchantRequestId|providerReference|correlationId/i;
const secretKeys = /secret|password|passkey|authorization|consumerKey|consumerSecret|token|receipt|phone|email|recipient|rawRequest|rawResponse|rawCallback|payload/i;

function digestIdentifier(value: unknown) {
  return `[redacted:${createHash("sha256").update(String(value)).digest("hex").slice(0, 12)}]`;
}

export function sanitizeLogValue(value: unknown, key?: string): unknown {
  if (key && identifierKeys.test(key)) return digestIdentifier(value);
  if (key && secretKeys.test(key)) return "[redacted]";
  if (Array.isArray(value)) return value.map((item) => sanitizeLogValue(item));
  if (value && typeof value === "object") {
    if (value instanceof Error) return { name: value.name, message: value.message };
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, sanitizeLogValue(entryValue, entryKey)]));
  }
  return value;
}

function sanitizeLogArguments(args: unknown[]) {
  return args.map((value) => sanitizeLogValue(value));
}

export const logger = {
  info: (...args: unknown[]) => console.log("[INFO]", ...sanitizeLogArguments(args)),
  warn: (...args: unknown[]) => console.warn("[WARN]", ...sanitizeLogArguments(args)),
  error: (...args: unknown[]) => console.error("[ERROR]", ...sanitizeLogArguments(args)),
};
