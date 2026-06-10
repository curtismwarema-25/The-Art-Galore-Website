export type PublicPersonRecord = {
  id: string;
  slug: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "published" | "archived" | "cancelled";
  name: string;
  preferredName?: string;
  pronunciation?: string;
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
  shortBio?: string;
  bio: string;
  quote?: string;
  artistStatement?: string;
  socials: {
    instagram?: string;
    tiktok?: string;
    facebook?: string;
    x?: string;
    youtube?: string;
    website?: string;
  };
  city?: string;
  medium: string;
  primaryArtForm?: string;
  secondaryArtForm?: string;
  yearsPracticing?: string;
  featuredWorks: string[];
  eventsParticipated: string[];
  eventRoles: string[];
  interestedInCollaborating?: boolean;
  additionalWorkUrl?: string;
  mediaReferences?: {
    profilePhotoUrl?: string;
    portfolioImagesUrl?: string;
  };
};

export type SerializedPersonRecord = PublicPersonRecord;

export type AdminPersonRecord = PublicPersonRecord & {
  email?: string;
  phone?: string;
  preferredContactMethod?: string;
  consentGiven?: boolean;
  importedFrom?: string;
  importNotes?: string;
};

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
  preferredName?: string;
  pronunciation?: string;
  email?: string;
  phone?: string;
  city?: string;
  preferredContactMethod?: string;
  role: string;
  category: AdminPersonCategoryInput;
  isArtist: boolean;
  shortBio?: string;
  bio: string;
  quote?: string;
  artistStatement?: string;
  medium?: string;
  primaryArtForm?: string;
  secondaryArtForm?: string;
  yearsPracticing?: string;
  socials?: PublicPersonRecord["socials"];
  eventRoles?: string[];
  interestedInCollaborating?: boolean;
  additionalWorkUrl?: string;
  mediaReferences?: PublicPersonRecord["mediaReferences"];
  consentGiven?: boolean;
  importedFrom?: string;
  importNotes?: string;
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
