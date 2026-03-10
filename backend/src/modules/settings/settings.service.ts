import { NotFoundError, ValidationError } from "../../common/errors/httpErrors.js";
import { SettingsRepository, type SiteSettingsWriteInput } from "./settings.repository.js";
import type { PublicSiteSettingsRecord, UpdateSiteSettingsInput } from "./settings.types.js";

function mapSettingsRecord(settings: {
  id: string;
  settingsKey: string;
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
  createdAt: Date;
  updatedAt: Date;
}): PublicSiteSettingsRecord {
  return {
    id: settings.id,
    slug: settings.settingsKey,
    status: "published",
    displayOrder: 1,
    siteName: settings.siteName,
    tagline: settings.tagline,
    footerText: settings.footerText,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    whatsappLink: settings.whatsappLink,
    instagram: settings.instagramUrl,
    tiktok: settings.tiktokUrl,
    x: settings.xUrl,
    facebook: settings.facebookUrl,
    heroTitle: settings.heroTitle,
    heroSubtitle: settings.heroSubtitle,
    featuredEventId: settings.featuredEventId ?? "",
    defaultMetaTitle: settings.defaultMetaTitle,
    defaultMetaDescription: settings.defaultMetaDescription,
    defaultSocialPreviewImage: settings.defaultSocialPreviewImageUrl,
    privacyPolicyLink: settings.privacyPolicyLink,
    termsLink: settings.termsLink,
    refundPolicyLink: settings.refundPolicyLink,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export class SettingsService {
  constructor(private readonly repository: SettingsRepository = new SettingsRepository()) {}

  async getPublicSettings() {
    const settings = await this.repository.getSettings();

    if (!settings) {
      throw new NotFoundError("Site settings not found");
    }

    return mapSettingsRecord(settings);
  }

  async getAdminSettings() {
    return this.getPublicSettings();
  }

  async updateAdminSettings(input: UpdateSiteSettingsInput) {
    if (input.featuredEventId !== undefined && input.featuredEventId.trim() !== "") {
      const event = await this.repository.findEventById(input.featuredEventId.trim());
      if (!event) {
        throw new ValidationError("Featured event reference is invalid");
      }
    }

    const updated = await this.repository.updateSettings({
      siteName: input.siteName?.trim(),
      tagline: input.tagline?.trim(),
      footerText: input.footerText?.trim(),
      contactEmail: input.contactEmail?.trim(),
      contactPhone: input.contactPhone?.trim(),
      whatsappLink: input.whatsappLink?.trim(),
      instagramUrl: input.instagram?.trim(),
      tiktokUrl: input.tiktok?.trim(),
      xUrl: input.x?.trim(),
      facebookUrl: input.facebook?.trim(),
      heroTitle: input.heroTitle?.trim(),
      heroSubtitle: input.heroSubtitle?.trim(),
      featuredEventId:
        input.featuredEventId === undefined
          ? undefined
          : input.featuredEventId.trim() === ""
            ? null
            : input.featuredEventId.trim(),
      defaultMetaTitle: input.defaultMetaTitle?.trim(),
      defaultMetaDescription: input.defaultMetaDescription?.trim(),
      defaultSocialPreviewImageUrl: input.defaultSocialPreviewImage?.trim(),
      privacyPolicyLink: input.privacyPolicyLink?.trim(),
      termsLink: input.termsLink?.trim(),
      refundPolicyLink: input.refundPolicyLink?.trim(),
    } satisfies SiteSettingsWriteInput);

    return mapSettingsRecord(updated);
  }
}
