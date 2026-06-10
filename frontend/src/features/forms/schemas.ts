import { z } from "zod";
import { mediaUrlOrPathSchema } from "@/lib/validation/media";

const phoneRegex = /^\+?\d{9,15}$/;

export const eventFormSchema = z.object({
  title: z.string().trim().min(3),
  type: z.string().trim().min(2),
  date: z.string().trim().min(1),
  time: z.string().trim().min(1),
  venue: z.string().trim().min(2),
  lifecycle: z.enum(["upcoming", "past", "draft"]),
});

export const partnerFormSchema = z.object({
  name: z.string().trim().min(2),
  logoText: z.string().trim().max(8).optional(),
  description: z.string().trim().min(10),
  partnershipType: z.string().trim().min(2),
  website: z.string().trim().url().or(z.literal("")),
  showOnHomepage: z.boolean(),
});

export const personFormSchema = z.object({
  name: z.string().trim().min(2),
  role: z.string().trim().min(2),
  category: z.enum(["leadership", "member"]),
  isArtist: z.boolean(),
  bio: z.string().trim().min(10),
  medium: z.string().trim().min(2),
  instagram: z.string().trim().optional(),
  x: z.string().trim().optional(),
  website: z.string().trim().url().optional().or(z.literal("")),
});

export const siteSettingsFormSchema = z.object({
  siteName: z.string().trim().min(2),
  tagline: z.string().trim().min(2),
  footerText: z.string().trim().min(10),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().min(7),
  whatsappLink: z.string().trim().url(),
  instagram: z.string().trim().url(),
  tiktok: z.string().trim().url(),
  x: z.string().trim().url(),
  facebook: z.string().trim().url(),
  heroTitle: z.string().trim().min(2),
  heroSubtitle: z.string().trim().min(10),
  featuredEventId: z.string().trim(),
  defaultMetaTitle: z.string().trim().min(5),
  defaultMetaDescription: z.string().trim().min(10),
  defaultSocialPreviewImage: mediaUrlOrPathSchema,
  privacyPolicyLink: z.string().trim().min(1),
  termsLink: z.string().trim().min(1),
  refundPolicyLink: z.string().trim().min(1),
  manualPaymentEnabled: z.boolean(),
  bankAccountName: z.string().trim().optional(),
  bankAccountNumber: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  bankBranch: z.string().trim().optional(),
  mpesaPaybill: z.string().trim().optional(),
  mpesaAccountInstructions: z.string().trim().optional(),
  supportContactText: z.string().trim().optional(),
  mpesaComingSoonMessage: z.string().trim().min(3),
});

export const ticketPurchaseFormSchema = z.object({
  eventId: z.string().trim().min(1),
  buyerName: z.string().trim().min(2, "Enter your name"),
  buyerPhone: z.string().trim().regex(phoneRegex, "Enter a valid phone number"),
  buyerEmail: z.string().trim().email("Enter a valid email for ticket delivery"),
  quantities: z.record(z.string(), z.number().int().min(0)),
});

export const communityUploadFormSchema = z.object({
  alias: z.string().trim().min(2),
  eventId: z.string().trim().min(1),
  file: z.instanceof(File),
});

export type EventFormInput = z.infer<typeof eventFormSchema>;
export type PartnerFormInput = z.infer<typeof partnerFormSchema>;
export type PersonFormInput = z.infer<typeof personFormSchema>;
export type SiteSettingsFormInput = z.infer<typeof siteSettingsFormSchema>;
export type TicketPurchaseFormInput = z.infer<typeof ticketPurchaseFormSchema>;
export type CommunityUploadFormInput = z.infer<typeof communityUploadFormSchema>;
