import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, resolve } from "node:path";
import { imageSize } from "image-size";
import { env } from "../../../config/env.js";
import type { MediaAssetRecord, MediaTarget } from "../media.types.js";

const mimeToExtensionMap: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

function toForwardSlashes(value: string) {
  return value.replace(/\\/g, "/");
}

export function resolveMediaRootPath() {
  if (isAbsolute(env.MEDIA_LOCAL_ROOT)) {
    return resolve(env.MEDIA_LOCAL_ROOT);
  }

  return resolve(process.cwd(), env.MEDIA_LOCAL_ROOT);
}

function resolveMediaPath(storageKey: string) {
  const normalized = toForwardSlashes(storageKey).replace(/^\/+/, "");

  if (!normalized || normalized.includes("..")) {
    throw new Error("Invalid storage key");
  }

  const root = resolveMediaRootPath();
  const absolute = resolve(root, normalized);

  if (!absolute.startsWith(root)) {
    throw new Error("Invalid storage key");
  }

  return { absolute, normalized };
}

function getMediaUrl(target: MediaTarget, storageKey: string) {
  const relativeUrl = `${env.API_PREFIX}${env.MEDIA_PUBLIC_BASE_PATH}/${storageKey}`;
  if (target !== "payment-proof" || !env.PUBLIC_API_URL) return relativeUrl;

  return `${env.PUBLIC_API_URL.replace(/\/+$/g, "")}${env.MEDIA_PUBLIC_BASE_PATH}/${storageKey}`;
}

function getFileExtension(mimeType: string, originalName: string) {
  const mapped = mimeToExtensionMap[mimeType];
  if (mapped) return mapped;

  const ext = extname(originalName).toLowerCase();
  if (ext && ext.length <= 8) return ext;

  return ".bin";
}

export type SaveMediaInput = {
  target: MediaTarget;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
};

class LocalMediaStorage {
  async save(input: SaveMediaInput): Promise<MediaAssetRecord> {
    const now = new Date();
    const extension = getFileExtension(input.mimeType, input.originalName);
    const storageKey = `${input.target}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${Date.now()}-${randomUUID()}${extension}`;
    const { absolute, normalized } = resolveMediaPath(storageKey);

    await mkdir(resolveMediaRootPath(), { recursive: true });
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, input.buffer);

    let width: number | undefined;
    let height: number | undefined;
    try {
      const dimensions = imageSize(input.buffer);
      width = dimensions.width;
      height = dimensions.height;
    } catch {
      width = undefined;
      height = undefined;
    }

    return {
      target: input.target,
      storageKey: normalized,
      url: getMediaUrl(input.target, normalized),
      mimeType: input.mimeType,
      sizeBytes: input.buffer.byteLength,
      width,
      height,
      originalName: input.originalName,
      uploadedAt: now.toISOString(),
    };
  }

  async delete(storageKey: string) {
    try {
      const { absolute } = resolveMediaPath(storageKey);
      await unlink(absolute);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "ENOENT"
      ) {
        return;
      }

      throw error;
    }
  }
}

export const localMediaStorage = new LocalMediaStorage();
