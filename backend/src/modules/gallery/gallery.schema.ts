import { z } from "zod";

const booleanQueryParam = z
  .union([z.boolean(), z.literal("true"), z.literal("false")])
  .transform((value) => value === true || value === "true");
const galleryStatusSchema = z.enum(["published", "archived"]);

export const listGalleryQuerySchema = z.object({
  query: z.object({
    eventId: z.string().trim().min(1).optional(),
    eventSlug: z.string().trim().min(1).optional(),
    featured: booleanQueryParam.optional(),
  }),
});

export const galleryImageIdParamsSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const listAdminGalleryQuerySchema = z.object({
  query: z.object({
    eventId: z.string().trim().min(1).optional(),
    search: z.string().trim().min(1).max(100).optional(),
    featured: booleanQueryParam.optional(),
    status: galleryStatusSchema.optional(),
  }),
});

const galleryMediaSchema = z.object({
  storageKey: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().nonnegative().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  url: z.string().trim().url(),
  alt: z.string().trim().min(1).max(255).optional(),
});

const createGalleryImageBodySchema = z.object({
  eventId: z.string().trim().min(1),
  caption: z.string().trim().min(1).max(255),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  status: galleryStatusSchema.optional(),
  media: galleryMediaSchema,
});

const updateGalleryImageBodySchema = createGalleryImageBodySchema
  .partial()
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "At least one field is required to update a gallery image.",
  });

export const createAdminGalleryImageSchema = z.object({
  body: createGalleryImageBodySchema,
});

export const updateAdminGalleryImageSchema = z.object({
  params: galleryImageIdParamsSchema.shape.params,
  body: updateGalleryImageBodySchema,
});

export type ListGalleryQuery = z.infer<typeof listGalleryQuerySchema>["query"];
export type GalleryImageIdParams = z.infer<typeof galleryImageIdParamsSchema>["params"];
export type ListAdminGalleryQuery = z.infer<typeof listAdminGalleryQuerySchema>["query"];
export type CreateAdminGalleryImageBody = z.infer<typeof createAdminGalleryImageSchema>["body"];
export type UpdateAdminGalleryImageBody = z.infer<typeof updateAdminGalleryImageSchema>["body"];
