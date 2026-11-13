import { describe, expect, it } from "vitest";
import { siteSettingsFormSchema, ticketPurchaseFormSchema } from "./schemas";

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

const siteSettingsInput = {
  siteName: "The Art Galore International",
  tagline: "A Free Space to Connect Us All",
  footerText: "The Art Galore International creates art experiences.",
  contactEmail: "hello@example.com",
  contactPhone: "+254 700 000 000",
  whatsappLink: "",
  instagram: "https://instagram.com/art-galore",
  tiktok: "https://tiktok.com/@art-galore",
  x: "",
  facebook: "",
  heroTitle: "A Free Space to Connect Us All",
  heroSubtitle: "Immersive events and shared creativity.",
  featuredEventId: "",
  defaultMetaTitle: "Art Galore International",
  defaultMetaDescription: "Discover art events and community experiences.",
  defaultSocialPreviewImage: "/bg.jpg",
  privacyPolicyLink: "/privacy-policy",
  termsLink: "/terms-of-use",
  refundPolicyLink: "/ticket-refund-policy",
  aboutTitle: "About Art Galore",
  aboutIntro: "A space for creativity and community.",
  aboutBody: "Art Galore brings people together through creative experiences.",
  contactTitle: "Let's connect.",
  contactIntro: "Contact us about events, tickets, and collaborations.",
  privacyPolicyContent: "Privacy policy content that is long enough for validation.",
  termsContent: "Terms and conditions content that is long enough for validation.",
  refundPolicyContent: "Refund policy content that is long enough for validation.",
  manualPaymentEnabled: true,
  mpesaComingSoonMessage: "Automated M-Pesa checkout coming soon",
};

describe("site settings optional social URL validation", () => {
  it("accepts empty optional WhatsApp, X, and Facebook URLs", () => {
    expect(siteSettingsFormSchema.safeParse(siteSettingsInput).success).toBe(true);
  });

  it.each([
    ["whatsappLink", "https://wa.me/254700000000"],
    ["x", "https://x.com/art-galore"],
    ["facebook", "https://facebook.com/art-galore"],
  ])("accepts a valid %s URL", (field, value) => {
    expect(siteSettingsFormSchema.safeParse({ ...siteSettingsInput, [field]: value }).success).toBe(true);
  });

  it.each(["whatsappLink", "x", "facebook"])("accepts whitespace-only %s values", (field) => {
    expect(siteSettingsFormSchema.safeParse({ ...siteSettingsInput, [field]: "   " }).success).toBe(true);
  });

  it.each([
    ["whatsappLink", "not a URL"],
    ["x", "example.com"],
    ["facebook", "www.facebook"],
  ])("rejects an invalid non-empty %s URL", (field, value) => {
    expect(siteSettingsFormSchema.safeParse({ ...siteSettingsInput, [field]: value }).success).toBe(false);
  });

  it("continues to reject invalid required settings fields", () => {
    expect(siteSettingsFormSchema.safeParse({ ...siteSettingsInput, siteName: "" }).success).toBe(false);
    expect(siteSettingsFormSchema.safeParse({ ...siteSettingsInput, instagram: "" }).success).toBe(false);
  });
});
