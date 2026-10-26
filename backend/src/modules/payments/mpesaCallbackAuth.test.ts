import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedMpesaCallbackIp } from "./mpesaCallbackAuth.js";

const officialCallbackIps = ["196.201.214.200", "196.201.214.206"];

test("callback IP allowlist accepts exact Safaricom addresses and IPv4-mapped addresses", () => {
  assert.equal(isAllowedMpesaCallbackIp("196.201.214.200", officialCallbackIps), true);
  assert.equal(isAllowedMpesaCallbackIp("::ffff:196.201.214.206", officialCallbackIps), true);
});
test("callback IP allowlist rejects missing, malformed, and unlisted addresses", () => {
  assert.equal(isAllowedMpesaCallbackIp(undefined, officialCallbackIps), false);
  assert.equal(isAllowedMpesaCallbackIp("not-an-ip", officialCallbackIps), false);
  assert.equal(isAllowedMpesaCallbackIp("196.201.214.201", officialCallbackIps), false);
  assert.equal(isAllowedMpesaCallbackIp("196.201.214.200", []), false);
});
