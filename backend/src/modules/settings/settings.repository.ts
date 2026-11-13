import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";

const DEFAULT_SETTINGS_DATA: Prisma.SiteSettingsUncheckedCreateInput = {
  settingsKey: "default",
  siteName: "The Art Galore International",
  tagline: "A Free Space to Connect Us All",
  footerText: "The Art Galore International creates immersive art experiences and cultural collaborations.",
  contactEmail: "theartgaloreintl@gmail.com",
  contactPhone: "+254 759 292 496",
  whatsappLink: "",
  instagramUrl: "https://www.instagram.com/the_art_galore_intl",
  tiktokUrl: "https://www.tiktok.com/@the_art_galore",
  xUrl: "",
  facebookUrl: "",
  heroTitle: "A Free Space to Connect Us All",
  heroSubtitle: "Immersive events, shared creativity, and community-centered experiences.",
  defaultMetaTitle: "The Art Galore International | A Free Space to Connect Us All",
  defaultMetaDescription: "Discover events, artists, galleries, and collaborations.",
  defaultSocialPreviewImageUrl: "/bg.jpg",
  privacyPolicyLink: "/privacy-policy",
  termsLink: "/terms-of-use",
  refundPolicyLink: "/ticket-refund-policy",
  aboutTitle: "The Art Galore International",
  aboutIntro: "A space for creativity, expression and community.",
  aboutBody: "The Art Galore International is a creative community built around the appreciation, expression and experience of art.\n\nWe believe art is more than something to look at. It is a way to connect people, share perspectives, explore ideas and create experiences that bring communities together.\n\nThrough creative gatherings, events and shared experiences, we create opportunities for people to engage with art, meet others and participate in a growing creative community.\n\nWhether you are an artist, an art enthusiast or simply curious about experiencing something different, you are welcome here.\n\nCome as you are. Experience art. Be part of the community.",
  contactTitle: "Let's connect.",
  contactIntro: "Have a question about an event, a ticket, a creative collaboration or something happening within our community? We would be glad to hear from you.",
  privacyPolicyContent: "The Art Galore International respects your privacy. This policy explains how information may be collected, used, stored and shared when you visit our website, enquire about our activities or purchase tickets for our events.\n\nWe may collect contact, order, payment-reference and technical information needed to operate the website. We use it to process orders, confirm payments, issue tickets, communicate event updates, respond to support requests and maintain security.\n\nPayments may be processed through third-party providers, including M-Pesa where enabled. We receive only the payment references, transaction status and related order information needed to confirm a purchase.\n\nThis working policy should be reviewed against the Kenya Data Protection Act, 2019 and applicable regulations.",
  termsContent: "These terms govern use of The Art Galore International website and the purchase of event tickets. By using the website or purchasing a ticket, you agree to follow these terms and event-specific conditions.\n\nTickets are subject to availability. Prices and applicable charges are displayed before purchase. A submitted order is not proof of successful payment; a ticket is confirmed only after required payment verification and issuance.\n\nPayments must use the methods shown during checkout. Never share an M-Pesa PIN, one-time password or account credentials with anyone claiming to represent the organisation. If payment appears successful but a ticket has not been issued, contact us with your order reference before making another payment.\n\nThese working terms should be reviewed against applicable laws of Kenya.",
  refundPolicyContent: "Tickets purchased for events organised by The Art Galore International are generally non-refundable. A change of plans, inability to attend, late arrival or failure to attend will not ordinarily qualify for a refund.\n\nExceptional requests may be considered individually and case by case. A refund is not guaranteed. If The Art Galore International cancels an event, affected ticket holders will be informed of available arrangements, including any applicable refund or alternative remedy. If an event is postponed, existing tickets will generally remain valid for the revised date, subject to communicated arrangements.\n\nNothing in this working policy is intended to remove or limit rights available under applicable law.",
  manualPaymentEnabled: true,
  mpesaPaybill: env.MPESA_SHORTCODE || null,
  mpesaAccountInstructions: env.MPESA_ACCOUNT_NUMBER
    ? `Pay M-Pesa Paybill ${env.MPESA_SHORTCODE || ""} for ${env.MPESA_BUSINESS_NAME}; use account number ${env.MPESA_ACCOUNT_NUMBER}.`
    : null,
  mpesaComingSoonMessage: "Automated M-Pesa checkout coming soon",
  supportContactText: "+254 700 533 716 / +254 758 732 652",
};

export type SiteSettingsWriteInput = Partial<{
  siteName: string;
  tagline: string;
  footerText: string;
  contactEmail: string;
  contactPhone: string;
  whatsappLink: string;
  instagramUrl: string;
  tiktokUrl: string;
  xUrl: string;
  facebookUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  featuredEventId: string | null;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  defaultSocialPreviewImageUrl: string;
  privacyPolicyLink: string;
  termsLink: string;
  refundPolicyLink: string;
  aboutTitle: string;
  aboutIntro: string;
  aboutBody: string;
  aboutImage: string | null;
  contactTitle: string;
  contactIntro: string;
  privacyPolicyContent: string;
  termsContent: string;
  refundPolicyContent: string;
  manualPaymentEnabled: boolean;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  bankBranch: string | null;
  mpesaPaybill: string | null;
  mpesaAccountInstructions: string | null;
  supportContactText: string | null;
  mpesaComingSoonMessage: string;
}>;

export class SettingsRepository {
  async getSettings() {
    const defaultSettings = await prisma.siteSettings.findUnique({
      where: {
        settingsKey: "default",
      },
    });

    if (defaultSettings) {
      return defaultSettings;
    }

    return prisma.siteSettings.findFirst({
      orderBy: { createdAt: "asc" },
    });
  }

  async findEventById(id: string) {
    return prisma.event.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  async updateSettings(input: SiteSettingsWriteInput) {
    const current = await this.getSettings();

    if (!current) {
      return prisma.siteSettings.create({
        data: {
          ...DEFAULT_SETTINGS_DATA,
          ...input,
        },
      });
    }

    return prisma.siteSettings.update({
      where: { id: current.id },
      data: input,
    });
  }
}
