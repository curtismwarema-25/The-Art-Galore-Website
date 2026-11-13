import { NotFoundError, ValidationError } from "../../common/errors/httpErrors.js";
import { env } from "../../config/env.js";
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
  aboutTitle: string | null;
  aboutIntro: string | null;
  aboutBody: string | null;
  aboutImage: string | null;
  contactTitle: string | null;
  contactIntro: string | null;
  privacyPolicyContent: string | null;
  termsContent: string | null;
  refundPolicyContent: string | null;
  manualPaymentEnabled: boolean;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  bankBranch: string | null;
  mpesaPaybill: string | null;
  mpesaAccountInstructions: string | null;
  supportContactText: string | null;
  mpesaComingSoonMessage: string;
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
    aboutTitle: settings.aboutTitle ?? "The Art Galore International",
    aboutIntro: settings.aboutIntro ?? "A space for creativity, expression and community.",
    aboutBody: settings.aboutBody ?? "The Art Galore International is a creative community built around the appreciation, expression and experience of art.",
    aboutImage: settings.aboutImage ?? undefined,
    contactTitle: settings.contactTitle ?? "Let's connect.",
    contactIntro: settings.contactIntro ?? "Have a question about an event, a ticket, a creative collaboration or something happening within our community? We would be glad to hear from you.",
    privacyPolicyContent: settings.privacyPolicyContent ?? "The Art Galore International respects your privacy. Please contact us with privacy questions or requests.",
    termsContent: settings.termsContent ?? "These terms govern use of The Art Galore International website and the purchase of event tickets.",
    refundPolicyContent: settings.refundPolicyContent ?? "Tickets are generally non-refundable. Contact us about exceptional circumstances or event changes.",
    manualPaymentEnabled: settings.manualPaymentEnabled,
    bankAccountName: settings.bankAccountName ?? undefined,
    bankAccountNumber: settings.bankAccountNumber ?? undefined,
    bankName: settings.bankName ?? undefined,
    bankBranch: settings.bankBranch ?? undefined,
    mpesaPaybill: settings.mpesaPaybill ?? (env.MPESA_SHORTCODE || undefined),
    mpesaAccountInstructions:
      settings.mpesaAccountInstructions ??
      (env.MPESA_ACCOUNT_NUMBER
        ? `Pay M-Pesa Paybill ${env.MPESA_SHORTCODE || ""} for ${env.MPESA_BUSINESS_NAME}; use account number ${env.MPESA_ACCOUNT_NUMBER}.`
        : undefined),
    supportContactText: settings.supportContactText ?? undefined,
    mpesaComingSoonMessage: settings.mpesaComingSoonMessage,
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
      aboutTitle: input.aboutTitle?.trim(),
      aboutIntro: input.aboutIntro?.trim(),
      aboutBody: input.aboutBody?.trim(),
      aboutImage: input.aboutImage === undefined ? undefined : input.aboutImage.trim() || null,
      contactTitle: input.contactTitle?.trim(),
      contactIntro: input.contactIntro?.trim(),
      privacyPolicyContent: input.privacyPolicyContent?.trim(),
      termsContent: input.termsContent?.trim(),
      refundPolicyContent: input.refundPolicyContent?.trim(),
      manualPaymentEnabled: input.manualPaymentEnabled,
      bankAccountName:
        input.bankAccountName === undefined ? undefined : input.bankAccountName.trim() || null,
      bankAccountNumber:
        input.bankAccountNumber === undefined ? undefined : input.bankAccountNumber.trim() || null,
      bankName: input.bankName === undefined ? undefined : input.bankName.trim() || null,
      bankBranch: input.bankBranch === undefined ? undefined : input.bankBranch.trim() || null,
      mpesaPaybill: input.mpesaPaybill === undefined ? undefined : input.mpesaPaybill.trim() || null,
      mpesaAccountInstructions:
        input.mpesaAccountInstructions === undefined ? undefined : input.mpesaAccountInstructions.trim() || null,
      supportContactText:
        input.supportContactText === undefined ? undefined : input.supportContactText.trim() || null,
      mpesaComingSoonMessage: input.mpesaComingSoonMessage?.trim(),
    } satisfies SiteSettingsWriteInput);

    return mapSettingsRecord(updated);
  }
}
