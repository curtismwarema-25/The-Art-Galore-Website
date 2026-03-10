import { z } from "zod";

export const loginRequestSchema = z.object({
  body: z.object({
    email: z.string().email("Valid email is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  }),
});
