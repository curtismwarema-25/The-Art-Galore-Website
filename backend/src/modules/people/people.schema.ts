import { z } from "zod";

const adminPeopleScopeSchema = z.enum(["all", "artists", "team"]);
const adminPersonStatusSchema = z.enum(["draft", "published", "archived"]);
const adminPersonCategorySchema = z.enum(["leadership", "member"]);

export const listPeopleQuerySchema = z.object({
  query: z.object({
    scope: adminPeopleScopeSchema.optional(),
    search: z.string().trim().min(1).max(100).optional(),
  }),
});

export const personSlugParamsSchema = z.object({
  params: z.object({
    slug: z.string().trim().min(1),
  }),
});

export const personIdParamsSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const listAdminPeopleQuerySchema = z.object({
  query: z.object({
    scope: adminPeopleScopeSchema.optional(),
    search: z.string().trim().min(1).max(100).optional(),
    status: adminPersonStatusSchema.optional(),
  }),
});

const personMediaMetaSchema = z
  .object({
    storageKey: z.string().trim().min(1).max(255).optional(),
    mimeType: z.string().trim().min(1).max(100).optional(),
    sizeBytes: z.number().int().nonnegative().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    url: z.string().trim().url().optional(),
    alt: z.string().trim().min(1).max(255).optional(),
  })
  .partial();

const eventParticipationSchema = z.object({
  eventId: z.string().trim().min(1),
  participationRole: z.string().trim().min(1).max(191).optional(),
});

const createPersonBodySchema = z.object({
  name: z.string().trim().min(2).max(191),
  slug: z.string().trim().min(1).max(191).optional(),
  role: z.string().trim().min(2).max(191),
  category: adminPersonCategorySchema,
  isArtist: z.boolean(),
  bio: z.string().trim().min(10).max(20_000),
  medium: z.string().trim().min(1).max(191).optional(),
  image: z.string().trim().url().optional(),
  imageMeta: personMediaMetaSchema.optional(),
  coverImage: z.string().trim().url().optional(),
  coverImageMeta: personMediaMetaSchema.optional(),
  status: adminPersonStatusSchema.optional(),
  displayOrder: z.number().int().nonnegative().optional(),
  featuredWorks: z.array(z.string().trim().min(1).max(191)).max(64).optional(),
  eventParticipations: z.array(eventParticipationSchema).max(128).optional(),
});

const updatePersonBodySchema = createPersonBodySchema
  .partial()
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "At least one field is required to update a person.",
  });

export const createAdminPersonSchema = z.object({
  body: createPersonBodySchema,
});

export const updateAdminPersonSchema = z.object({
  params: personIdParamsSchema.shape.params,
  body: updatePersonBodySchema,
});

export type ListPeopleQuery = z.infer<typeof listPeopleQuerySchema>["query"];
export type PersonSlugParams = z.infer<typeof personSlugParamsSchema>["params"];
export type ListAdminPeopleQuery = z.infer<typeof listAdminPeopleQuerySchema>["query"];
export type PersonIdParams = z.infer<typeof personIdParamsSchema>["params"];
export type CreateAdminPersonBody = z.infer<typeof createAdminPersonSchema>["body"];
export type UpdateAdminPersonBody = z.infer<typeof updateAdminPersonSchema>["body"];
