import { z } from "zod";
import { mediaMetadataSchema, mediaUrlOrPathSchema } from "../../common/validation/mediaUrl.js";

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

const personMediaMetaSchema = mediaMetadataSchema;

const eventParticipationSchema = z.object({
  eventId: z.string().trim().min(1),
  participationRole: z.string().trim().min(1).max(191).optional(),
});

const optionalTextSchema = z.string().trim().max(191).optional();
const optionalLongTextSchema = z.string().trim().max(20_000).optional();
const socialsSchema = z.object({
  instagram: z.string().trim().max(500).optional(),
  tiktok: z.string().trim().max(500).optional(),
  facebook: z.string().trim().max(500).optional(),
  x: z.string().trim().max(500).optional(),
  youtube: z.string().trim().max(500).optional(),
  website: z.string().trim().max(500).optional(),
}).optional();

const mediaReferencesSchema = z.object({
  profilePhotoUrl: z.string().trim().max(1_000).optional(),
  portfolioImagesUrl: z.string().trim().max(1_000).optional(),
}).optional();

const createPersonBodySchema = z.object({
  name: z.string().trim().min(2).max(191),
  slug: z.string().trim().min(1).max(191).optional(),
  preferredName: optionalTextSchema,
  pronunciation: optionalTextSchema,
  email: z.string().trim().email().max(191).optional(),
  phone: z.string().trim().max(64).optional(),
  city: optionalTextSchema,
  preferredContactMethod: z.string().trim().max(64).optional(),
  role: z.string().trim().min(2).max(191),
  category: adminPersonCategorySchema,
  isArtist: z.boolean(),
  shortBio: optionalLongTextSchema,
  bio: z.string().trim().min(10).max(20_000),
  quote: z.string().trim().max(500).optional(),
  artistStatement: optionalLongTextSchema,
  medium: z.string().trim().min(1).max(191).optional(),
  primaryArtForm: optionalTextSchema,
  secondaryArtForm: optionalTextSchema,
  yearsPracticing: optionalTextSchema,
  socials: socialsSchema,
  eventRoles: z.array(z.string().trim().min(1).max(191)).max(64).optional(),
  interestedInCollaborating: z.boolean().optional(),
  additionalWorkUrl: z.string().trim().max(1_000).optional(),
  mediaReferences: mediaReferencesSchema,
  consentGiven: z.boolean().optional(),
  importedFrom: z.string().trim().max(191).optional(),
  importNotes: z.string().trim().max(2_000).optional(),
  image: mediaUrlOrPathSchema.optional(),
  imageMeta: personMediaMetaSchema.optional(),
  coverImage: mediaUrlOrPathSchema.optional(),
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
