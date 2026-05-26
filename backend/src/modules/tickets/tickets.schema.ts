import { z } from "zod";

export const publicTicketTokenParamsSchema = z.object({
  params: z.object({
    publicTicketToken: z.string().trim().min(20).max(191),
  }),
});

export const adminTicketSearchQuerySchema = z.object({
  query: z.object({
    query: z.string().trim().min(2).max(120),
    eventId: z.string().trim().min(1).optional(),
    ticketStatus: z.enum(["active", "checked_in", "revoked", "cancelled"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const adminTicketCheckInSchema = z.object({
  body: z.object({
    query: z.string().trim().min(2).max(255),
    method: z.enum(["qr", "manual"]).default("manual"),
    checkpointLabel: z.string().trim().min(2).max(100).optional(),
    notes: z.string().trim().max(255).optional(),
  }),
});

export const adminIssueOrderTicketsParamsSchema = z.object({
  params: z.object({
    orderId: z.string().trim().min(1).max(191),
  }),
});

export const adminTicketDeliveryOrderParamsSchema = z.object({
  params: z.object({
    orderId: z.string().trim().min(1).max(191),
  }),
});

export const adminTicketVerifyParamsSchema = z.object({
  params: z.object({
    publicTicketToken: z.string().trim().min(20).max(191),
  }),
});

export type PublicTicketTokenParams = z.infer<typeof publicTicketTokenParamsSchema>["params"];
export type AdminTicketSearchQuery = z.infer<typeof adminTicketSearchQuerySchema>["query"];
export type AdminTicketCheckInBody = z.infer<typeof adminTicketCheckInSchema>["body"];
export type AdminIssueOrderTicketsParams = z.infer<typeof adminIssueOrderTicketsParamsSchema>["params"];
export type AdminTicketDeliveryOrderParams = z.infer<typeof adminTicketDeliveryOrderParamsSchema>["params"];
export type AdminTicketVerifyParams = z.infer<typeof adminTicketVerifyParamsSchema>["params"];
