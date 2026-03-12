import { z } from "zod";
import { mediaUrlOrPathSchema } from "../../common/validation/mediaUrl.js";

export const publicSettingsRouteSchema = z.object({
  params: z.object({}),
  query: z.object({}),
});

export const adminSettingsRouteSchema = z.object({
  params: z.object({}),
  query: z.object({}),
});

const updateSettingsBodySchema = z
  .object({
    siteName: z.string().trim().min(2).max(191).optional(),
    tagline: z.string().trim().min(2).max(255).optional(),
    footerText: z.string().trim().min(10).optional(),
    contactEmail: z.string().trim().email().optional(),
    contactPhone: z.string().trim().min(7).max(32).optional(),
    whatsappLink: z.string().trim().url().optional(),
    instagram: z.string().trim().url().optional(),
    tiktok: z.string().trim().url().optional(),
    x: z.string().trim().url().optional(),
    facebook: z.string().trim().url().optional(),
    heroTitle: z.string().trim().min(2).max(191).optional(),
    heroSubtitle: z.string().trim().min(10).optional(),
    featuredEventId: z.string().trim().max(191).optional(),
    defaultMetaTitle: z.string().trim().min(5).max(191).optional(),
    defaultMetaDescription: z.string().trim().min(10).optional(),
    defaultSocialPreviewImage: mediaUrlOrPathSchema.optional(),
    privacyPolicyLink: z.string().trim().min(1).max(500).optional(),
    termsLink: z.string().trim().min(1).max(500).optional(),
    refundPolicyLink: z.string().trim().min(1).max(500).optional(),
    manualPaymentEnabled: z.boolean().optional(),
    bankAccountName: z.string().trim().max(191).optional(),
    bankAccountNumber: z.string().trim().max(64).optional(),
    bankName: z.string().trim().max(191).optional(),
    bankBranch: z.string().trim().max(191).optional(),
    mpesaPaybill: z.string().trim().max(32).optional(),
    mpesaAccountInstructions: z.string().trim().max(500).optional(),
    supportContactText: z.string().trim().max(255).optional(),
    mpesaComingSoonMessage: z.string().trim().min(3).max(255).optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "At least one field is required to update site settings.",
  });

export const updateAdminSettingsSchema = z.object({
  body: updateSettingsBodySchema,
});

export type UpdateAdminSettingsBody = z.infer<typeof updateAdminSettingsSchema>["body"];
