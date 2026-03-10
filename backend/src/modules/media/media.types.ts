export const MEDIA_TARGETS = [
  "gallery",
  "partner-logo",
  "person-profile",
  "person-cover",
  "event-hero",
  "community",
] as const;

export type MediaTarget = (typeof MEDIA_TARGETS)[number];

export type MediaAssetRecord = {
  target: MediaTarget;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  originalName: string;
  uploadedAt: string;
};
