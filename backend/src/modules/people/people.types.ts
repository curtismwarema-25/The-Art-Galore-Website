export type PublicPersonRecord = {
  id: string;
  slug: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "published" | "archived" | "cancelled";
  name: string;
  role: string;
  category: "leadership" | "member";
  isArtist: boolean;
  image: string;
  imageMeta?: {
    storageKey?: string;
    mimeType?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
    url?: string;
    alt?: string;
  };
  coverImage?: string;
  coverImageMeta?: {
    storageKey?: string;
    mimeType?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
    url?: string;
    alt?: string;
  };
  bio: string;
  socials: {
    instagram?: string;
    x?: string;
    website?: string;
  };
  medium: string;
  featuredWorks: string[];
  eventsParticipated: string[];
};

export type SerializedPersonRecord = PublicPersonRecord;

export type AdminPersonStatusInput = "draft" | "published" | "archived";
export type AdminPersonCategoryInput = "leadership" | "member";

export type PersonMediaMetadata = {
  storageKey?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  url?: string;
  alt?: string;
};

export type PersonEventParticipationInput = {
  eventId: string;
  participationRole?: string;
};

export type AdminCreatePersonInput = {
  name: string;
  slug?: string;
  role: string;
  category: AdminPersonCategoryInput;
  isArtist: boolean;
  bio: string;
  medium?: string;
  image?: string;
  imageMeta?: PersonMediaMetadata;
  coverImage?: string;
  coverImageMeta?: PersonMediaMetadata;
  status?: AdminPersonStatusInput;
  displayOrder?: number;
  featuredWorks?: string[];
  eventParticipations?: PersonEventParticipationInput[];
};

export type AdminUpdatePersonInput = Partial<AdminCreatePersonInput>;
