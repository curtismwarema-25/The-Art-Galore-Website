import type { GalleryImage } from "@prisma/client";
import { NotFoundError, ValidationError } from "../../common/errors/httpErrors.js";
import {
  GalleryRepository,
  type AdminGalleryListFilters,
  type GalleryImageWriteInput,
  type GalleryListFilters,
} from "./gallery.repository.js";
import { cleanupReplacedMedia } from "../media/mediaLifecycle.js";
import type {
  AdminCreateGalleryImageInput,
  AdminUpdateGalleryImageInput,
  PublicGalleryImageRecord,
  SerializedGalleryImageRecord,
} from "./gallery.types.js";

type GalleryImageWithEvent = GalleryImage & {
  event: {
    id: string;
    slug: string;
    title: string;
  };
};

function mapGalleryImageRecord(image: GalleryImageWithEvent): PublicGalleryImageRecord {
  return {
    id: image.id,
    slug: image.id,
    status: image.isActive ? "published" : "archived",
    eventId: image.eventId,
    image: image.imageUrl,
    media: {
      storageKey: image.storageKey,
      mimeType: image.mimeType,
      sizeBytes: image.sizeBytes ?? undefined,
      width: image.width ?? undefined,
      height: image.height ?? undefined,
      url: image.imageUrl,
      alt: image.altText ?? undefined,
    },
    caption: image.caption,
    featured: image.featured,
    sortOrder: image.sortOrder,
    uploadState: "uploaded",
    displayOrder: image.sortOrder,
    createdAt: image.createdAt.toISOString(),
    updatedAt: image.updatedAt.toISOString(),
  };
}

export class GalleryService {
  constructor(private readonly repository: GalleryRepository = new GalleryRepository()) {}

  async listPublicGalleryImages(filters: GalleryListFilters) {
    const records = await this.repository.listPublicGalleryImages(filters);
    return records.map((record) => mapGalleryImageRecord(record as GalleryImageWithEvent));
  }

  async listAdminGalleryImages(filters: AdminGalleryListFilters) {
    const records = await this.repository.listAdminGalleryImages(filters);
    return records.map((record) => mapGalleryImageRecord(record as GalleryImageWithEvent));
  }

  async getAdminGalleryImageById(id: string) {
    const record = await this.repository.getAdminGalleryImageById(id);

    if (!record) {
      throw new NotFoundError("Gallery image not found");
    }

    return mapGalleryImageRecord(record as GalleryImageWithEvent);
  }

  private async assertEventExists(eventId: string) {
    const event = await this.repository.findEventById(eventId);
    if (!event) {
      throw new ValidationError("Event reference is invalid");
    }
  }

  private parseGalleryStatus(status?: "published" | "archived") {
    if (status === "archived") return false;
    return true;
  }

  async createAdminGalleryImage(input: AdminCreateGalleryImageInput) {
    await this.assertEventExists(input.eventId);

    const createdId = await this.repository.createGalleryImage({
      eventId: input.eventId,
      caption: input.caption.trim(),
      imageUrl: input.media.url,
      storageKey: input.media.storageKey,
      mimeType: input.media.mimeType,
      sizeBytes: input.media.sizeBytes,
      width: input.media.width,
      height: input.media.height,
      altText: input.media.alt,
      featured: input.featured ?? false,
      sortOrder: input.sortOrder,
      isActive: this.parseGalleryStatus(input.status),
    } satisfies GalleryImageWriteInput);

    return this.getAdminGalleryImageById(createdId);
  }

  async updateAdminGalleryImage(id: string, input: AdminUpdateGalleryImageInput) {
    const existing = await this.repository.findGalleryImageById(id);
    if (!existing) {
      throw new NotFoundError("Gallery image not found");
    }

    if (input.eventId) {
      await this.assertEventExists(input.eventId);
    }

    const previousStorageKey = existing.storageKey;
    const nextStorageKey = input.media?.storageKey ?? previousStorageKey;

    await this.repository.updateGalleryImage(id, {
      eventId: input.eventId,
      caption: input.caption?.trim(),
      imageUrl: input.media?.url,
      storageKey: input.media?.storageKey,
      mimeType: input.media?.mimeType,
      sizeBytes: input.media?.sizeBytes,
      width: input.media?.width,
      height: input.media?.height,
      altText: input.media?.alt,
      featured: input.featured,
      sortOrder: input.sortOrder,
      isActive: input.status ? this.parseGalleryStatus(input.status) : undefined,
    });
    await cleanupReplacedMedia(previousStorageKey, nextStorageKey);

    return this.getAdminGalleryImageById(id);
  }

  async archiveAdminGalleryImage(id: string) {
    const existing = await this.repository.findGalleryImageById(id);
    if (!existing) {
      throw new NotFoundError("Gallery image not found");
    }

    await this.repository.archiveGalleryImage(id);
  }
}
