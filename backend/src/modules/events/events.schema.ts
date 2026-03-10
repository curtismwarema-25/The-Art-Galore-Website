import { z } from "zod";

const phaseSchema = z.enum(["upcoming", "past", "all"]);
const adminEventStatusSchema = z.enum(["draft", "published", "cancelled", "archived"]);
const adminEventLifecycleSchema = z.enum(["draft", "upcoming", "past", "cancelled"]);
const adminTicketTierStatusSchema = z.enum(["draft", "published", "archived"]);
const isoCurrencySchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, "Currency must be a 3-letter code")
  .transform((value) => value.toUpperCase());

export const listEventsQuerySchema = z.object({
  query: z.object({
    phase: phaseSchema.optional(),
    type: z.string().trim().min(1).max(100).optional(),
    search: z.string().trim().min(1).max(100).optional(),
  }),
});

export const eventSlugParamsSchema = z.object({
  params: z.object({
    slug: z.string().trim().min(1),
  }),
});

export const adminEventIdParamsSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const adminEventTicketTierParamsSchema = z.object({
  params: z.object({
    eventId: z.string().trim().min(1),
  }),
});

export const adminTicketTierIdParamsSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const listAdminEventsQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().min(1).max(100).optional(),
    status: adminEventStatusSchema.optional(),
  }),
});

const eventMediaMetaSchema = z
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

const eventLineupItemSchema = z.object({
  personId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(191),
  role: z.string().trim().min(1).max(191),
});

const adminCreateEventBodySchema = z.object({
  title: z.string().trim().min(3).max(191),
  slug: z.string().trim().min(1).max(191).optional(),
  type: z.string().trim().min(1).max(100),
  summary: z.string().trim().min(1).max(500).optional(),
  description: z.string().trim().min(1).max(10_000).optional(),
  venue: z.string().trim().min(1).max(191),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  timezone: z.string().trim().min(1).max(64).optional(),
  capacity: z.number().int().positive().optional(),
  status: adminEventStatusSchema.optional(),
  lifecycle: adminEventLifecycleSchema.optional(),
  heroImage: z.string().trim().url().optional(),
  heroImageMeta: eventMediaMetaSchema.optional(),
  highlights: z.array(z.string().trim().min(1).max(255)).max(32).optional(),
  lineup: z.array(eventLineupItemSchema).max(64).optional(),
  supportedBy: z.array(z.string().trim().min(1).max(191)).max(32).optional(),
  displayOrder: z.number().int().nonnegative().optional(),
});

const adminUpdateEventBodySchema = adminCreateEventBodySchema.partial().refine((value) => {
  return Object.values(value).some((entry) => entry !== undefined);
}, "At least one field is required to update an event.");

export const adminCreateEventSchema = z.object({
  body: adminCreateEventBodySchema,
});

export const adminUpdateEventSchema = z.object({
  params: adminEventIdParamsSchema.shape.params,
  body: adminUpdateEventBodySchema,
});

const adminTicketTierBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(191).optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  price: z.number().min(0),
  currency: isoCurrencySchema.optional(),
  available: z.number().int().nonnegative(),
  saleStartAt: z.coerce.date().optional(),
  saleEndAt: z.coerce.date().optional(),
  maxPerOrder: z.number().int().positive().optional(),
  displayOrder: z.number().int().nonnegative().optional(),
  status: adminTicketTierStatusSchema.optional(),
  perks: z.array(z.string().trim().min(1).max(191)).max(32).optional(),
});

const adminUpdateTicketTierBodySchema = adminTicketTierBodySchema.partial().refine((value) => {
  return Object.values(value).some((entry) => entry !== undefined);
}, "At least one field is required to update a ticket tier.");

export const adminCreateTicketTierSchema = z.object({
  params: adminEventTicketTierParamsSchema.shape.params,
  body: adminTicketTierBodySchema,
});

export const adminUpdateTicketTierSchema = z.object({
  params: adminTicketTierIdParamsSchema.shape.params,
  body: adminUpdateTicketTierBodySchema,
});

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>["query"];
export type EventSlugParams = z.infer<typeof eventSlugParamsSchema>["params"];
export type ListAdminEventsQuery = z.infer<typeof listAdminEventsQuerySchema>["query"];
export type AdminEventIdParams = z.infer<typeof adminEventIdParamsSchema>["params"];
export type AdminEventTicketTierParams = z.infer<typeof adminEventTicketTierParamsSchema>["params"];
export type AdminTicketTierIdParams = z.infer<typeof adminTicketTierIdParamsSchema>["params"];
export type AdminCreateEventBody = z.infer<typeof adminCreateEventSchema>["body"];
export type AdminUpdateEventBody = z.infer<typeof adminUpdateEventSchema>["body"];
export type AdminCreateTicketTierBody = z.infer<typeof adminCreateTicketTierSchema>["body"];
export type AdminUpdateTicketTierBody = z.infer<typeof adminUpdateTicketTierSchema>["body"];
