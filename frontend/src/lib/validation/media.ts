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
    message: "Must be an absolute URL or a relative media path.",
  });

export const optionalMediaUrlOrPathFieldSchema = z.union([mediaUrlOrPathSchema, z.literal("")]);
