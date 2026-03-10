import { ValidationError } from "../../../common/errors/httpErrors.js";
import { env } from "../../../config/env.js";
import { localMediaStorage } from "./localStorage.js";

class MediaStorageProvider {
  private get provider() {
    if (env.STORAGE_PROVIDER === "local") {
      return localMediaStorage;
    }

    throw new ValidationError(`Unsupported storage provider: ${env.STORAGE_PROVIDER}`);
  }

  save = this.provider.save.bind(this.provider);
  delete = this.provider.delete.bind(this.provider);
}

export const mediaStorage = new MediaStorageProvider();
