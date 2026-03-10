import type { MediaTarget } from "./media.types.js";

export type MediaValidationRule = {
  acceptedMimeTypes: string[];
  maxSizeBytes: number;
};

const TEN_MB = 10 * 1024 * 1024;
const EIGHT_MB = 8 * 1024 * 1024;
const FIVE_MB = 5 * 1024 * 1024;

export const mediaValidationByTarget: Record<MediaTarget, MediaValidationRule> = {
  gallery: {
    acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeBytes: TEN_MB,
  },
  "partner-logo": {
    acceptedMimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/webp"],
    maxSizeBytes: FIVE_MB,
  },
  "person-profile": {
    acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeBytes: EIGHT_MB,
  },
  "person-cover": {
    acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeBytes: TEN_MB,
  },
  "event-hero": {
    acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeBytes: TEN_MB,
  },
  community: {
    acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeBytes: TEN_MB,
  },
};
