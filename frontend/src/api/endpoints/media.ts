import { apiUrl, ApiError } from "@/api/client";

export const mediaTargets = [
  "gallery",
  "partner-logo",
  "person-profile",
  "person-cover",
  "event-hero",
  "community",
  "payment-proof",
] as const;

export type MediaTarget = (typeof mediaTargets)[number];

export type UploadedMediaAsset = {
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

type ApiData<T> = { data: T };

export async function uploadMediaFile(file: File, target: MediaTarget): Promise<UploadedMediaAsset> {
  const body = new FormData();
  body.append("target", target);
  body.append("file", file);

  const response = await fetch(apiUrl("/media/upload"), {
    method: "POST",
    credentials: "include",
    body,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let code: string | undefined;
    let details: unknown;

    try {
      const payload = (await response.json()) as {
        error?: { message?: string; code?: string; details?: unknown };
      };
      message = payload.error?.message ?? message;
      code = payload.error?.code;
      details = payload.error?.details;
    } catch {
      // no-op, fallback message already set
    }

    throw new ApiError(message, response.status, code, details);
  }

  const payload = (await response.json()) as ApiData<UploadedMediaAsset>;
  return payload.data;
}

export async function deleteMediaAsset(storageKey: string) {
  const query = new URLSearchParams({ storageKey }).toString();
  const response = await fetch(apiUrl(`/media?${query}`), {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok && response.status !== 204) {
    let message = `Request failed with status ${response.status}`;
    let code: string | undefined;
    let details: unknown;

    try {
      const payload = (await response.json()) as {
        error?: { message?: string; code?: string; details?: unknown };
      };
      message = payload.error?.message ?? message;
      code = payload.error?.code;
      details = payload.error?.details;
    } catch {
      // no-op
    }

    throw new ApiError(message, response.status, code, details);
  }
}
