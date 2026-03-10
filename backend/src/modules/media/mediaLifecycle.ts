import { logger } from "../../common/utils/logger.js";
import { mediaStorage } from "./storage/provider.js";

export async function cleanupReplacedMedia(oldStorageKey?: string | null, nextStorageKey?: string | null) {
  if (!oldStorageKey || !nextStorageKey || oldStorageKey === nextStorageKey) return;

  try {
    await mediaStorage.delete(oldStorageKey);
  } catch (error) {
    logger.warn("Failed to delete replaced media file", {
      oldStorageKey,
      error,
    });
  }
}

export async function cleanupDeletedMedia(storageKey?: string | null) {
  if (!storageKey) return;

  try {
    await mediaStorage.delete(storageKey);
  } catch (error) {
    logger.warn("Failed to delete media file", { storageKey, error });
  }
}
