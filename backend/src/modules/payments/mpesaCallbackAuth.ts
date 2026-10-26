import { isIP } from "node:net";

function normalizeIpAddress(value: string) {
  const trimmed = value.trim().replace(/^\[|\]$/g, "");
  return trimmed.startsWith("::ffff:") ? trimmed.slice("::ffff:".length) : trimmed;
}
export function isAllowedMpesaCallbackIp(remoteAddress: string | undefined, allowedAddresses: string[]) {
  if (!remoteAddress || allowedAddresses.length === 0) return false;
  const remoteIp = normalizeIpAddress(remoteAddress);
  if (isIP(remoteIp) === 0) return false;
  return allowedAddresses.some((candidate) => {
    const allowedIp = normalizeIpAddress(candidate);
    return isIP(allowedIp) !== 0 && remoteIp === allowedIp;
  });
}
