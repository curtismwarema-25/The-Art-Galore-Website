export type PublicGalleryImageRecord = {
  id: string;
  slug: string;
  status: "draft" | "published" | "archived" | "cancelled";
  eventId: string;
  image: string;
  media: {
    storageKey?: string;
    mimeType?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
    url?: string;
    alt?: string;
  };
  caption: string;
  featured: boolean;
  sortOrder: number;
  uploadState: "idle" | "uploading" | "uploaded" | "failed";
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SerializedGalleryImageRecord = PublicGalleryImageRecord;
export type GalleryStatusInput = "published" | "archived";

export type GalleryImageMediaInput = {
  storageKey: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  url: string;
  alt?: string;
};

export type AdminCreateGalleryImageInput = {
  eventId: string;
  caption: string;
  featured?: boolean;
  sortOrder?: number;
  status?: GalleryStatusInput;
  media: GalleryImageMediaInput;
};

export type AdminUpdateGalleryImageInput = Partial<AdminCreateGalleryImageInput>;
