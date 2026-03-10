export type PublicPartnerRecord = {
  id: string;
  slug: string;
  status: "draft" | "published" | "archived" | "cancelled";
  name: string;
  logoText: string;
  logoMeta?: {
    storageKey?: string;
    mimeType?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
    url?: string;
    alt?: string;
  };
  description: string;
  partnershipType: string;
  website?: string;
  showOnHomepage: boolean;
  visibility?: "homepage" | "directory-only";
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SerializedPartnerRecord = PublicPartnerRecord;

export type PartnerStatusInput = "draft" | "published" | "archived";

export type PartnerMediaMetadata = {
  storageKey?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  url?: string;
  alt?: string;
};

export type AdminCreatePartnerInput = {
  name: string;
  slug?: string;
  status?: PartnerStatusInput;
  description: string;
  partnershipType?: string;
  website?: string;
  logoText?: string;
  logoMeta?: PartnerMediaMetadata;
  showOnHomepage?: boolean;
  displayOrder?: number;
};

export type AdminUpdatePartnerInput = Partial<AdminCreatePartnerInput>;
