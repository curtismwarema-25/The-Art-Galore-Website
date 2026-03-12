import { z } from "zod";

function isAbsoluteHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isAppRelativePath(value: string) {
  return value.startsWith("/");
}

export function isMediaUrlOrPath(value: string) {
  return isAppRelativePath(value) || isAbsoluteHttpUrl(value);
}

export const mediaUrlOrPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => isMediaUrlOrPath(value), {
    message: "Must be an absolute URL or a relative path.",
  });

export const mediaMetadataSchema = z.object({
  storageKey: z.string().trim().min(1).max(255).optional(),
  mimeType: z.string().trim().min(1).max(100).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  url: mediaUrlOrPathSchema.optional(),
  alt: z.string().trim().min(1).max(255).optional(),
});
