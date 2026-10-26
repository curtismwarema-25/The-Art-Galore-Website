import { describe, expect, it } from "vitest";
import { ticketPurchaseFormSchema } from "./schemas";

const baseInput = {
  eventId: "event-1",
  buyerName: "Test Buyer",
  buyerEmail: "buyer@example.com",
  quantities: { "tier-1": 1 },
};

describe("ticket purchase phone validation", () => {
  it("accepts Kenyan mobile formats used by the payment service", () => {
    expect(ticketPurchaseFormSchema.safeParse({ ...baseInput, buyerPhone: "0712345678" }).success).toBe(true);
    expect(ticketPurchaseFormSchema.safeParse({ ...baseInput, buyerPhone: "+254712345678" }).success).toBe(true);
  });

  it("rejects numbers the payment service cannot normalize", () => {
    expect(ticketPurchaseFormSchema.safeParse({ ...baseInput, buyerPhone: "123456789" }).success).toBe(false);
    expect(ticketPurchaseFormSchema.safeParse({ ...baseInput, buyerPhone: "0812345678" }).success).toBe(false);
  });
});
