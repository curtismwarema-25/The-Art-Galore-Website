import { z } from "zod";

export const eventFormSchema = z
  .object({
    title: z.string().trim().min(3),
    type: z.string().trim().min(2),
    venue: z.string().trim().min(2),
    capacity: z.preprocess(
      (value) => (value === "" || value === undefined || value === null ? undefined : Number(value)),
      z.number().int().positive().optional(),
    ),
    startAt: z.string().trim().min(1),
    endAt: z.string().trim().min(1),
    lifecycle: z.enum(["draft", "upcoming", "past", "cancelled"]),
    summary: z.string().trim().max(500).optional(),
    timezone: z.string().trim().min(1).max(64),
  })
  .refine((value) => new Date(value.endAt).getTime() > new Date(value.startAt).getTime(), {
    message: "End date/time must be after start date/time.",
    path: ["endAt"],
  });
