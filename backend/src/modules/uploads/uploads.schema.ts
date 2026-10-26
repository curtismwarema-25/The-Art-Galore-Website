import { z } from "zod";
import { mediaUrlOrPathSchema } from "../../common/validation/mediaUrl.js";

const moderationStatusSchema = z.enum(["pending", "approved", "rejected"]);
const reviewDecisionSchema = z.enum(["approved", "rejected"]);

const uploadMediaSchema = z.object({
  storageKey: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(100),
  sizeBytes: z.number().int().nonnegative().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  url: mediaUrlOrPathSchema,
});

export const listCommunityUploadsQuerySchema = z.object({
  query: z.object({
    eventId: z.string().trim().min(1).optional(),
  }),
});

export const createCommunityUploadSchema = z.object({
  body: z.object({
    eventId: z.string().trim().min(1),
    alias: z.string().trim().min(2).max(120),
    submitterEmail: z.string().trim().email().optional(),
    submitterPhone: z.string().trim().min(7).max(32).optional(),
    consentGiven: z.literal(true),
    media: uploadMediaSchema,
  }),
});

export const uploadIdParamsSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const listAdminUploadsQuerySchema = z.object({
  query: z.object({
    eventId: z.string().trim().min(1).optional(),
    status: moderationStatusSchema.optional(),
    search: z.string().trim().min(1).max(100).optional(),
  }),
});

export const moderateCommunityUploadSchema = z.object({
  params: uploadIdParamsSchema.shape.params,
  body: z.object({
    decision: reviewDecisionSchema,
    notes: z.string().trim().min(1).max(500).optional(),
  }),
});

export type ListCommunityUploadsQuery = z.infer<typeof listCommunityUploadsQuerySchema>["query"];
export type CreateCommunityUploadBody = z.infer<typeof createCommunityUploadSchema>["body"];
export type UploadIdParams = z.infer<typeof uploadIdParamsSchema>["params"];
export type ListAdminUploadsQuery = z.infer<typeof listAdminUploadsQuerySchema>["query"];
export type ModerateCommunityUploadBody = z.infer<typeof moderateCommunityUploadSchema>["body"];
