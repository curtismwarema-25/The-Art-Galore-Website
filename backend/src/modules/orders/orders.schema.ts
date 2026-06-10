import { z } from "zod";

const phoneRegex = /^\+?\d{9,15}$/;

const orderStatusSchema = z.enum([
  "pending_payment",
  "payment_submitted",
  "payment_verified",
  "payment_rejected",
  "paid",
  "expired",
]);

const createOrderItemSchema = z.object({
  ticketTierId: z.string().trim().min(1),
  quantity: z.number().int().positive().max(20),
});

const createOrderBuyerSchema = z.object({
  buyerName: z.string().trim().min(2).max(191),
  buyerPhone: z.string().trim().regex(phoneRegex, "Enter a valid phone number"),
  buyerEmail: z.string().trim().email("Enter a valid email for ticket delivery").max(191),
});

export const createOrderSchema = z.object({
  body: z.object({
    eventId: z.string().trim().min(1),
    buyer: createOrderBuyerSchema,
    items: z.array(createOrderItemSchema).min(1).max(20),
  }),
});

export const orderTrackingTokenParamsSchema = z.object({
  params: z.object({
    publicToken: z.string().trim().min(20).max(191),
  }),
});

export const adminOrderIdParamsSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const listAdminOrdersQuerySchema = z.object({
  query: z.object({
    status: orderStatusSchema.optional(),
    eventId: z.string().trim().min(1).optional(),
    search: z.string().trim().min(1).max(100).optional(),
  }),
});

export type CreateOrderBody = z.infer<typeof createOrderSchema>["body"];
export type OrderTrackingTokenParams = z.infer<typeof orderTrackingTokenParamsSchema>["params"];
export type AdminOrderIdParams = z.infer<typeof adminOrderIdParamsSchema>["params"];
export type ListAdminOrdersQuery = z.infer<typeof listAdminOrdersQuerySchema>["query"];
