import { z } from "zod";

const phoneRegex = /^\+?\d{9,15}$/;

const orderStatusSchema = z.enum(["pending", "paid", "failed", "expired", "refunded"]);

const createOrderItemSchema = z.object({
  ticketTierId: z.string().trim().min(1),
  quantity: z.number().int().positive().max(20),
});

const createOrderBuyerSchema = z.object({
  fullName: z.string().trim().min(2).max(191),
  phone: z.string().trim().regex(phoneRegex, "Enter a valid phone number"),
  email: z.string().trim().email().max(191).optional(),
});

export const createOrderSchema = z.object({
  body: z.object({
    eventId: z.string().trim().min(1),
    buyer: createOrderBuyerSchema,
    items: z.array(createOrderItemSchema).min(1).max(20),
  }),
});

export const orderNumberParamsSchema = z.object({
  params: z.object({
    orderNumber: z.string().trim().min(1).max(40),
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
export type OrderNumberParams = z.infer<typeof orderNumberParamsSchema>["params"];
export type AdminOrderIdParams = z.infer<typeof adminOrderIdParamsSchema>["params"];
export type ListAdminOrdersQuery = z.infer<typeof listAdminOrdersQuerySchema>["query"];
