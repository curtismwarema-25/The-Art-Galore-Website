import { z } from "zod";
import { mediaUrlOrPathSchema } from "../../common/validation/mediaUrl.js";

const phoneRegex = /^\+?\d{9,15}$/;
const screenshotMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export const submitManualPaymentParamsSchema = z.object({
  params: z.object({
    publicToken: z.string().trim().min(20).max(191),
  }),
});

export const submitManualPaymentBodySchema = z.object({
  paymentMethod: z.enum(["bank", "mpesa", "manual"]),
  payerName: z.string().trim().min(2).max(191),
  phoneNumber: z.string().trim().regex(phoneRegex, "Enter a valid phone number"),
  amountPaid: z.coerce.number().positive().max(1_000_000_000),
  transactionReference: z.string().trim().min(3).max(191),
  screenshot: z
    .object({
      url: mediaUrlOrPathSchema,
      storageKey: z.string().trim().min(1).max(255),
      mimeType: z.enum(screenshotMimeTypes),
      sizeBytes: z.number().int().positive().max(5 * 1024 * 1024),
    })
    .optional(),
  notes: z.string().trim().max(500).optional(),
});

export const submitManualPaymentSchema = z.object({
  params: submitManualPaymentParamsSchema.shape.params,
  body: submitManualPaymentBodySchema,
});

export const listAdminManualPaymentsQuerySchema = z.object({
  query: z.object({
    verificationStatus: z.enum(["pending_review", "approved", "rejected"]).optional(),
    orderId: z.string().trim().min(1).optional(),
    search: z.string().trim().min(1).max(100).optional(),
  }),
});

export const adminManualPaymentIdParamsSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const reviewManualPaymentSchema = z.object({
  body: z.object({
    verificationNote: z.string().trim().max(500).optional(),
  }),
});

export const reviewManualPaymentActionSchema = z.object({
  params: adminManualPaymentIdParamsSchema.shape.params,
  body: reviewManualPaymentSchema.shape.body,
});

export type SubmitManualPaymentParams = z.infer<typeof submitManualPaymentParamsSchema>["params"];
export type SubmitManualPaymentBody = z.infer<typeof submitManualPaymentBodySchema>;
export type ListAdminManualPaymentsQuery = z.infer<typeof listAdminManualPaymentsQuerySchema>["query"];
export type AdminManualPaymentIdParams = z.infer<typeof adminManualPaymentIdParamsSchema>["params"];
export type ReviewManualPaymentBody = z.infer<typeof reviewManualPaymentSchema>["body"];
