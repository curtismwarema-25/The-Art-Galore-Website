import { z } from "zod";
import { MEDIA_TARGETS } from "./media.types.js";

export const mediaTargetSchema = z.enum(MEDIA_TARGETS);

export const deleteMediaQuerySchema = z.object({
  query: z.object({
    storageKey: z.string().trim().min(1),
  }),
});

export type MediaTargetInput = z.infer<typeof mediaTargetSchema>;
