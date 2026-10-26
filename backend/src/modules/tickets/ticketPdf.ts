import PDFDocument from "pdfkit";
import { mapTicketStatus, type PublicTicketWithRelations } from "./tickets.repository.js";

type TicketPdfOptions = {
  brandName: string;
  ticket: PublicTicketWithRelations;
  qrImageBuffer: Buffer;
};

const BRAND = {
  background: "#FFFFFF",
  surface: "#E8E4F5",
  midnight: "#141738",
  indigo: "#3E458D",
  purple: "#7B6AB5",
  border: "#D8D1EA",
  white: "#FFFFFF",
  danger: "#B4233A",
  dangerSurface: "#FCE8EC",
};

function formatDateTime(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  }).format(value);
}

function formatStatus(status: ReturnType<typeof mapTicketStatus>) {
  if (status === "checked_in") return "Checked In";
  if (status === "revoked") return "Revoked";
  if (status === "cancelled") return "Cancelled";
  return "Active";
}

function formatStatusColors(status: ReturnType<typeof mapTicketStatus>) {
  if (status === "revoked" || status === "cancelled") {
    return { foreground: BRAND.danger, background: BRAND.dangerSurface, border: "#F3C4CC" };
  }
  if (status === "checked_in") {
    return { foreground: BRAND.white, background: BRAND.indigo, border: BRAND.indigo };
  }
  return { foreground: BRAND.white, background: BRAND.purple, border: BRAND.purple };
}

function writeField(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number) {
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BRAND.indigo)
    .text(label.toUpperCase(), x, y, { width: 250, characterSpacing: 0.8 });
  doc.font("Helvetica").fontSize(11).fillColor(BRAND.midnight)
    .text(value, x, y + 14, { width: 255, lineGap: 2 });
}

export async function renderTicketPdf({ brandName, ticket, qrImageBuffer }: TicketPdfOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      info: {
        Title: `${ticket.ticketNumber} - ${ticket.event.title}`,
        Author: brandName,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const ticketStatus = mapTicketStatus(ticket.status);
    const issuedDate = formatDateTime(ticket.issuedAt, ticket.event.timezone);
    const eventStart = formatDateTime(ticket.event.startAt, ticket.event.timezone);
    const eventEnd = formatDateTime(ticket.event.endAt, ticket.event.timezone);
    const checkedInAt = ticket.checkIns[0]?.checkedInAt
      ? formatDateTime(ticket.checkIns[0].checkedInAt, ticket.event.timezone)
      : "Not checked in";

    const pageWidth = doc.page.width;
    const cardX = 36;
    const cardY = 142;
    const cardWidth = pageWidth - 72;
    const statusColors = formatStatusColors(ticketStatus);

    doc.rect(0, 0, pageWidth, doc.page.height).fill(BRAND.background);
    doc.rect(0, 0, pageWidth, 126).fill(BRAND.midnight);
    doc.roundedRect(pageWidth - 142, 34, 92, 54, 12).fill("#201D49");
    doc.circle(pageWidth - 96, 61, 18).fill(BRAND.purple);
    doc.circle(pageWidth - 96, 61, 7).fill(BRAND.midnight);

    doc.font("Helvetica-Bold").fontSize(10).fillColor(BRAND.surface)
      .text(brandName.toUpperCase(), 42, 28, { characterSpacing: 1.5 });
    doc.font("Helvetica-Bold").fontSize(25).fillColor(BRAND.white).text("Event Ticket", 42, 48);
    doc.font("Helvetica").fontSize(11).fillColor(BRAND.surface).text(ticket.ticketNumber, 43, 84);
    doc.moveTo(42, 108).lineTo(112, 108).lineWidth(3).stroke(BRAND.purple);

    doc.roundedRect(cardX, cardY, cardWidth, 634, 14)
      .fillAndStroke(BRAND.surface, BRAND.border);

    doc.font("Helvetica-Bold").fontSize(8).fillColor(BRAND.indigo)
      .text("YOUR ADMISSION PASS", 60, 164, { characterSpacing: 1.6 });
    doc.font("Helvetica-Bold").fontSize(18).fillColor(BRAND.midnight)
      .text(ticket.event.title, 60, 184, { width: 320, height: 42, ellipsis: true });
    doc.font("Helvetica").fontSize(11).fillColor(BRAND.indigo)
      .text(ticket.ticketTier.name, 60, 229, { width: 280 });

    doc.roundedRect(416, 165, 122, 30, 15)
      .fillAndStroke(statusColors.background, statusColors.border);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(statusColors.foreground)
      .text(formatStatus(ticketStatus).toUpperCase(), 422, 175, { width: 110, align: "center", characterSpacing: 0.5 });

    doc.save();
    doc.dash(4, { space: 4 }).moveTo(344, 250).lineTo(344, 635).lineWidth(1).stroke(BRAND.border);
    doc.restore();

    writeField(doc, "Event Date", `${eventStart} to ${eventEnd}`, 60, 274);
    writeField(doc, "Venue", ticket.event.venueName, 60, 332);
    writeField(doc, "Order Number", ticket.order.orderNumber, 60, 390);
    writeField(doc, "Attendee", ticket.order.buyerName, 60, 448);
    writeField(doc, "Issued At", issuedDate, 60, 506);
    writeField(doc, "Checked In At", checkedInAt, 60, 564);

    doc.roundedRect(367, 267, 168, 168, 10).fill(BRAND.white);
    if (qrImageBuffer.length > 0) {
      doc.image(qrImageBuffer, 376, 276, {
        fit: [150, 150],
        align: "center",
        valign: "center",
      });
    }
    doc.roundedRect(367, 267, 168, 168, 10).lineWidth(1).stroke(BRAND.border);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(BRAND.midnight)
      .text("SCAN AT THE DOOR", 367, 448, { width: 168, align: "center", characterSpacing: 0.7 });
    doc.font("Helvetica").fontSize(8).fillColor(BRAND.indigo)
      .text("Keep this QR code ready for check-in.", 367, 463, { width: 168, align: "center" });
    doc.font("Helvetica-Bold").fontSize(8).fillColor(BRAND.midnight)
      .text("Ticket access token", 367, 498, { width: 168, align: "center" });
    doc.font("Helvetica").fontSize(7).fillColor(BRAND.indigo)
      .text(ticket.publicTicketToken, 372, 512, { width: 158, align: "center", lineGap: 2 });

    doc.roundedRect(59, 660, cardWidth - 46, 82, 9).fill(BRAND.white);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(BRAND.midnight)
      .text("A few things to know", 76, 675);
    doc.font("Helvetica").fontSize(9).fillColor(BRAND.indigo)
      .text("This ticket is non-transferable unless approved by the organizers.", 76, 694, {
        width: cardWidth - 86,
      });
    doc.font("Helvetica").fontSize(8).fillColor(BRAND.indigo)
      .text(`Issued by ${brandName}`, 76, 718, { width: cardWidth - 86 });

    doc.end();
  });
}
