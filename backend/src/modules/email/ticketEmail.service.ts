import nodemailer from "nodemailer";
import { ValidationError } from "../../common/errors/httpErrors.js";
import { env } from "../../config/env.js";
import { generateQrCodeDataUrl, qrDataUrlToBuffer } from "../tickets/ticketQr.js";
import { renderTicketPdf } from "../tickets/ticketPdf.js";
import type { TicketDeliveryOrderWithRelations } from "../tickets/tickets.repository.js";

type TicketEmailDeliveryResult =
  | {
      status: "skipped";
      reason: "disabled" | "missing_recipient";
    }
  | {
      status: "sent";
      messageId?: string;
    };

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getReplyToAddress(buyerEmail: string) {
  const candidate = buyerEmail.trim();
  // Order creation validates buyer emails. This extra check protects legacy or
  // manually edited records from making the entire delivery fail at SMTP time.
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate);
  if (looksLikeEmail) return candidate;

  const fallback = env.EMAIL_REPLY_TO.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fallback) ? fallback : undefined;
}

function getPublicApiBaseUrl() {
  if (env.PUBLIC_API_URL.trim()) {
    return stripTrailingSlash(env.PUBLIC_API_URL.trim());
  }

  return `http://localhost:${env.PORT}${env.API_PREFIX}`;
}

function getTicketUrl(publicTicketToken: string) {
  return `${stripTrailingSlash(env.PUBLIC_APP_URL)}/tickets/${encodeURIComponent(publicTicketToken)}`;
}

function getTicketDownloadUrl(publicTicketToken: string) {
  return `${getPublicApiBaseUrl()}/tickets/${encodeURIComponent(publicTicketToken)}/download`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatEventDate(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  }).format(value);
}

function assertEmailConfigured() {
  if (!env.SMTP_HOST || !env.EMAIL_FROM) {
    throw new ValidationError("Email delivery is enabled but SMTP_HOST or EMAIL_FROM is missing");
  }
}

function buildTicketSummary(order: TicketDeliveryOrderWithRelations) {
  return order.tickets
    .map((ticket) => ({
      ticketNumber: ticket.ticketNumber,
      ticketTierName: ticket.ticketTier.name,
      ticketUrl: getTicketUrl(ticket.publicTicketToken),
      downloadUrl: getTicketDownloadUrl(ticket.publicTicketToken),
    }));
}

function buildTextBody(order: TicketDeliveryOrderWithRelations) {
  const eventStart = formatEventDate(order.event.startAt, order.event.timezone);
  const eventEnd = formatEventDate(order.event.endAt, order.event.timezone);
  const ticketSummary = buildTicketSummary(order)
    .map(
      (ticket, index) =>
        `${index + 1}. ${ticket.ticketNumber} (${ticket.ticketTierName})\n` +
        `   Open ticket: ${ticket.ticketUrl}\n` +
        `   Download PDF: ${ticket.downloadUrl}`,
    )
    .join("\n\n");

  return [
    `Hi ${order.buyerName},`,
    "",
    `Your tickets for ${order.event.title} are ready.`,
    "",
    `Order: ${order.orderNumber}`,
    `Event: ${order.event.title}`,
    `When: ${eventStart} to ${eventEnd}`,
    `Venue: ${order.event.venueName}`,
    "",
    "Tickets:",
    ticketSummary,
    "",
    "Please present each ticket QR code at check-in.",
    "",
    "Art Galore International",
  ].join("\n");
}

function buildHtmlBody(order: TicketDeliveryOrderWithRelations) {
  const eventStart = formatEventDate(order.event.startAt, order.event.timezone);
  const eventEnd = formatEventDate(order.event.endAt, order.event.timezone);
  const tickets = buildTicketSummary(order)
    .map(
      (ticket) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
            <strong>${escapeHtml(ticket.ticketNumber)}</strong><br />
            <span style="color:#4b5563;">${escapeHtml(ticket.ticketTierName)}</span>
          </td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;">
            <a href="${escapeHtml(ticket.ticketUrl)}" style="color:#7c2d12;">Open</a>
            <span style="color:#9ca3af;"> | </span>
            <a href="${escapeHtml(ticket.downloadUrl)}" style="color:#7c2d12;">Download PDF</a>
          </td>
        </tr>`,
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
      <h1 style="margin:0 0 16px;font-size:22px;">Your tickets are ready</h1>
      <p>Hi ${escapeHtml(order.buyerName)},</p>
      <p>Your tickets for <strong>${escapeHtml(order.event.title)}</strong> are ready.</p>
      <table style="border-collapse:collapse;margin:20px 0;width:100%;max-width:640px;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Order</td>
          <td style="padding:8px 0;text-align:right;">${escapeHtml(order.orderNumber)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">When</td>
          <td style="padding:8px 0;text-align:right;">${escapeHtml(eventStart)} to ${escapeHtml(eventEnd)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Venue</td>
          <td style="padding:8px 0;text-align:right;">${escapeHtml(order.event.venueName)}</td>
        </tr>
      </table>
      <table style="border-collapse:collapse;width:100%;max-width:640px;border-top:1px solid #e5e7eb;">
        ${tickets}
      </table>
      <p style="margin-top:20px;color:#4b5563;">Please present each ticket QR code at check-in.</p>
      <p style="color:#4b5563;">Art Galore International</p>
    </div>`;
}

async function buildPdfAttachments(order: TicketDeliveryOrderWithRelations) {
  if (!env.EMAIL_ATTACH_TICKET_PDFS) return [];

  return Promise.all(
    order.tickets.map(async (ticket) => {
      const qrCodeDataUrl = await generateQrCodeDataUrl(ticket.qrCodeValue, 520);
      const payload = await renderTicketPdf({
        brandName: "Art Galore International",
        ticket,
        qrImageBuffer: qrDataUrlToBuffer(qrCodeDataUrl),
      });
      const safeTicketNumber = ticket.ticketNumber.replace(/[^a-zA-Z0-9-_]/g, "_");

      return {
        filename: `${safeTicketNumber}.pdf`,
        content: payload,
        contentType: "application/pdf",
      };
    }),
  );
}

export class TicketEmailService {
  async sendTicketDeliveryEmail(order: TicketDeliveryOrderWithRelations): Promise<TicketEmailDeliveryResult> {
    if (!env.EMAIL_DELIVERY_ENABLED) {
      return { status: "skipped", reason: "disabled" };
    }

    if (!order.buyerEmail) {
      return { status: "skipped", reason: "missing_recipient" };
    }

    assertEmailConfigured();

    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASSWORD,
          }
        : undefined,
    });

    const result = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: order.buyerEmail,
      replyTo: getReplyToAddress(order.buyerEmail),
      subject: `Your tickets for ${order.event.title}`,
      text: buildTextBody(order),
      html: buildHtmlBody(order),
      attachments: await buildPdfAttachments(order),
    });

    return { status: "sent", messageId: result.messageId };
  }
}
