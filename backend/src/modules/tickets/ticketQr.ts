import QRCode from "qrcode";

const QR_TICKET_PREFIX = "agi-ticket:";

export function buildTicketQrPayload(publicTicketToken: string) {
  return `${QR_TICKET_PREFIX}${publicTicketToken}`;
}

export function normalizeTicketLookupInput(input: string) {
  const normalized = input.trim();
  if (!normalized) return normalized;

  if (normalized.startsWith(QR_TICKET_PREFIX)) {
    return normalized.slice(QR_TICKET_PREFIX.length);
  }

  try {
    const parsed = new URL(normalized);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const ticketsSegmentIndex = segments.findIndex((segment) => segment === "tickets");
    const nextSegment = ticketsSegmentIndex >= 0 ? segments[ticketsSegmentIndex + 1] : undefined;

    if (nextSegment && nextSegment.length >= 20) {
      return nextSegment;
    }
  } catch {
    // Not a URL, treat as plain lookup input.
  }

  return normalized;
}

export async function generateQrCodeDataUrl(payload: string, width = 320) {
  return QRCode.toDataURL(payload, {
    type: "image/png",
    width,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#111111",
      light: "#FFFFFF",
    },
  });
}

export function qrDataUrlToBuffer(dataUrl: string) {
  const [, base64] = dataUrl.split(",", 2);
  if (!base64) {
    return Buffer.alloc(0);
  }

  return Buffer.from(base64, "base64");
}
