import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

const DEFAULT_SETTINGS_DATA: Prisma.SiteSettingsUncheckedCreateInput = {
  settingsKey: "default",
  siteName: "Art Galore International",
  tagline: "Where Art Comes Alive",
  footerText: "Art Galore International creates immersive art experiences and cultural collaborations.",
  contactEmail: "hello@artgaloreinternational.org",
  contactPhone: "+254700000000",
  whatsappLink: "https://wa.me/254711000000",
  instagramUrl: "https://instagram.com/artgaloreinternational",
  tiktokUrl: "https://tiktok.com/@artgaloreinternational",
  xUrl: "https://x.com/artgaloreintl",
  facebookUrl: "https://facebook.com/artgaloreinternational",
  heroTitle: "Where Art Comes Alive",
  heroSubtitle: "Immersive events, shared creativity, and community-centered experiences.",
  defaultMetaTitle: "Art Galore International | Immersive Art Experiences",
  defaultMetaDescription: "Discover events, artists, galleries, and collaborations.",
  defaultSocialPreviewImageUrl: "/og-image.jpg",
  privacyPolicyLink: "/privacy-policy",
  termsLink: "/terms-of-use",
  refundPolicyLink: "/ticket-refund-policy",
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
