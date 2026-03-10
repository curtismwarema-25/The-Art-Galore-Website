import { ValidationError } from "../../common/errors/httpErrors.js";
import { mediaValidationByTarget } from "./media.config.js";
import type { MediaAssetRecord, MediaTarget } from "./media.types.js";
import { mediaStorage } from "./storage/provider.js";

export type UploadMediaInput = {
  target: MediaTarget;
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
};

export class MediaService {
  validateUploadInput(input: UploadMediaInput) {
    const rules = mediaValidationByTarget[input.target];

    if (!rules.acceptedMimeTypes.includes(input.mimeType)) {
      throw new ValidationError("Unsupported file type for selected target");
    }

    if (input.sizeBytes > rules.maxSizeBytes) {
      throw new ValidationError("File exceeds size limit for selected target");
    }
  }

  async upload(input: UploadMediaInput): Promise<MediaAssetRecord> {
    this.validateUploadInput(input);

    return mediaStorage.save({
      target: input.target,
      buffer: input.buffer,
      mimeType: input.mimeType,
      originalName: input.originalName,
    });
  }

  async delete(storageKey: string) {
    await mediaStorage.delete(storageKey);
  }
}
