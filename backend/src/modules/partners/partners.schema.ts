import { z } from "zod";
import { mediaMetadataSchema } from "../../common/validation/mediaUrl.js";

const booleanQueryParam = z
  .union([z.boolean(), z.literal("true"), z.literal("false")])
  .transform((value) => value === true || value === "true");
const partnerStatusSchema = z.enum(["draft", "published", "archived"]);

export const listPartnersQuerySchema = z.object({
  query: z.object({
    homepageOnly: booleanQueryParam.optional(),
    context: z.enum(["HOMEPAGE", "DIRECTORY", "EVENT"]).optional(),
    eventSlug: z.string().trim().min(1).optional(),
    search: z.string().trim().min(1).max(100).optional(),
  }),
});

export const partnerIdParamsSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const listAdminPartnersQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().min(1).max(100).optional(),
    status: partnerStatusSchema.optional(),
    homepageOnly: booleanQueryParam.optional(),
  }),
});

const partnerMediaMetaSchema = mediaMetadataSchema;

const createPartnerBodySchema = z.object({
  name: z.string().trim().min(2).max(191),
  slug: z.string().trim().min(1).max(191).optional(),
  status: partnerStatusSchema.optional(),
  description: z.string().trim().min(10).max(20_000),
  partnershipType: z.string().trim().min(2).max(100).optional(),
  website: z.string().trim().url().optional(),
  logoText: z.string().trim().min(1).max(16).optional(),
  logoMeta: partnerMediaMetaSchema.optional(),
  showOnHomepage: z.boolean().optional(),
  displayOrder: z.number().int().nonnegative().optional(),
});

const updatePartnerBodySchema = createPartnerBodySchema
  .partial()
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "At least one field is required to update a partner.",
  });

export const createAdminPartnerSchema = z.object({
  body: createPartnerBodySchema,
});

export const updateAdminPartnerSchema = z.object({
  params: partnerIdParamsSchema.shape.params,
  body: updatePartnerBodySchema,
});

export type ListPartnersQuery = z.infer<typeof listPartnersQuerySchema>["query"];
export type PartnerIdParams = z.infer<typeof partnerIdParamsSchema>["params"];
export type ListAdminPartnersQuery = z.infer<typeof listAdminPartnersQuerySchema>["query"];
export type CreateAdminPartnerBody = z.infer<typeof createAdminPartnerSchema>["body"];
export type UpdateAdminPartnerBody = z.infer<typeof updateAdminPartnerSchema>["body"];
