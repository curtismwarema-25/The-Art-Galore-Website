import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";
import { env } from "../../config/index.js";
import { isLegacyMpesaCallbackConfigured } from "../../config/env.js";
import { assertMpesaCallbackAuthorized } from "./payments.routes.js";

function request(input: { callbackToken?: string; query?: Record<string, string>; headers?: Record<string, string> }) {
  const headers = new Map(Object.entries(input.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    params: input.callbackToken === undefined ? {} : { callbackToken: input.callbackToken },
    query: input.query ?? {},
    header(name: string) {
      return headers.get(name.toLowerCase());
    },
  } as unknown as Request;
}

test("callback authentication supports tokenized and explicitly enabled legacy contracts", () => {
  const original = {
    NODE_ENV: env.NODE_ENV,
    MPESA_CALLBACK_PATH_TOKEN: env.MPESA_CALLBACK_PATH_TOKEN,
    MPESA_CALLBACK_SECRET: env.MPESA_CALLBACK_SECRET,
    MPESA_LEGACY_CALLBACK_QUERY_ENABLED: env.MPESA_LEGACY_CALLBACK_QUERY_ENABLED,
    MPESA_CALLBACK_URL: env.MPESA_CALLBACK_URL,
  };

  try {
    env.NODE_ENV = "production";
    env.MPESA_CALLBACK_PATH_TOKEN = "path-token";
    env.MPESA_CALLBACK_SECRET = "legacy-secret";
    env.MPESA_LEGACY_CALLBACK_QUERY_ENABLED = true;

    assert.doesNotThrow(() => assertMpesaCallbackAuthorized(request({ callbackToken: "path-token" })));
    assert.throws(
      () => assertMpesaCallbackAuthorized(request({ callbackToken: "path-token", query: { secret: "legacy-secret" } })),
      /not accepted on the tokenized callback route/,
    );
    assert.doesNotThrow(() => assertMpesaCallbackAuthorized(request({ query: { secret: "legacy-secret" } })));
    assert.throws(() => assertMpesaCallbackAuthorized(request({ query: { secret: "wrong-secret" } })), /Invalid M-Pesa callback secret/);

    env.MPESA_LEGACY_CALLBACK_QUERY_ENABLED = false;
    assert.throws(() => assertMpesaCallbackAuthorized(request({ query: { secret: "legacy-secret" } })), /path authentication is required/);

    env.MPESA_CALLBACK_PATH_TOKEN = "";
    env.MPESA_CALLBACK_URL = "https://payments.example.com/api/payments/mpesa/stk/callback?secret=legacy-secret";
    assert.equal(isLegacyMpesaCallbackConfigured(env), true);
    assert.doesNotThrow(() => assertMpesaCallbackAuthorized(request({ query: { secret: "legacy-secret" } })));
    assert.throws(() => assertMpesaCallbackAuthorized(request({ query: { secret: "wrong-secret" } })), /Invalid M-Pesa callback secret/);
  } finally {
    Object.assign(env, original);
  }
});
