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
