export type UploadTarget =
  | "community"
  | "gallery"
  | "partner-logo"
  | "event-hero"
  | "person-profile"
  | "person-cover"
  | "payment-proof";

export type FileValidationOptions = {
  acceptedMimeTypes?: string[];
  maxSizeBytes?: number;
};

export type FileValidationResult = {
  valid: boolean;
  error?: string;
};

const defaultValidationByTarget: Record<UploadTarget, FileValidationOptions> = {
  community: { acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"], maxSizeBytes: 10 * 1024 * 1024 },
  gallery: { acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"], maxSizeBytes: 10 * 1024 * 1024 },
  "partner-logo": { acceptedMimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/webp"], maxSizeBytes: 5 * 1024 * 1024 },
  "event-hero": { acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"], maxSizeBytes: 10 * 1024 * 1024 },
  "person-profile": { acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"], maxSizeBytes: 8 * 1024 * 1024 },
  "person-cover": { acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"], maxSizeBytes: 10 * 1024 * 1024 },
  "payment-proof": { acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"], maxSizeBytes: 5 * 1024 * 1024 },
};

export function validateFile(file: File, target: UploadTarget, overrides?: FileValidationOptions): FileValidationResult {
  const options = { ...defaultValidationByTarget[target], ...overrides };

  if (options.acceptedMimeTypes?.length && !options.acceptedMimeTypes.includes(file.type)) {
    return { valid: false, error: "Unsupported file type." };
  }

  if (options.maxSizeBytes && file.size > options.maxSizeBytes) {
    return { valid: false, error: "File exceeds size limit." };
  }

  return { valid: true };
}

export function createPreviewUrl(file: File) {
  return URL.createObjectURL(file);
}

export function revokePreviewUrl(url?: string | null) {
  if (!url) return;
  URL.revokeObjectURL(url);
}
