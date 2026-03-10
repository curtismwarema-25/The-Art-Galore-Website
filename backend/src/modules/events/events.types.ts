export type PublicEventLineupItem = {
  id: string;
  personId?: string;
  name: string;
  role: string;
  image?: string;
};

export type EventMediaMetadata = {
  storageKey?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  url?: string;
  alt?: string;
};

export type PublicTicketTier = {
  id: string;
  slug: string;
  eventId: string;
  status: "draft" | "published" | "archived" | "cancelled";
  name: string;
  description?: string;
  price: number;
  currency: "KES";
  perks: string[];
  available: number;
  saleStartAt?: string;
  saleEndAt?: string;
  maxPerOrder?: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicGalleryImage = {
  id: string;
  slug: string;
  status: "draft" | "published" | "archived" | "cancelled";
  eventId: string;
  image: string;
  media: EventMediaMetadata;
  caption: string;
  featured: boolean;
  sortOrder: number;
  uploadState: "idle" | "uploading" | "uploaded" | "failed";
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicCommunityUpload = {
  id: string;
  slug: string;
  eventId: string;
  alias: string;
  image: string;
  media: EventMediaMetadata;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicEventRecord = {
  id: string;
  slug: string;
  status: "draft" | "published" | "archived" | "cancelled";
  title: string;
  type: string;
  phase: "upcoming" | "past";
  lifecycle: "draft" | "upcoming" | "past" | "cancelled";
  summary: string;
  description: string;
  date: string;
  time: string;
  startAt: string;
  endAt: string;
  timezone: string;
  venue: string;
  capacity: number;
  heroImage: string;
  heroImageMeta?: EventMediaMetadata;
  supportedBy: string[];
  highlights: string[];
  lineup: PublicEventLineupItem[];
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicEventDetailRecord = PublicEventRecord & {
  ticketTiers: PublicTicketTier[];
  galleryImages: PublicGalleryImage[];
  approvedUploads: PublicCommunityUpload[];
};

export type SerializedEventRecord = PublicEventRecord;
export type SerializedTicketTierRecord = PublicTicketTier;
export type SerializedEventDetailRecord = PublicEventDetailRecord;

export type AdminEventStatusInput = "draft" | "published" | "cancelled" | "archived";
export type AdminEventLifecycleInput = "draft" | "upcoming" | "past" | "cancelled";
export type AdminTicketTierStatusInput = "draft" | "published" | "archived";

export type AdminEventLineupInput = {
  personId?: string;
  name: string;
  role: string;
};

export type AdminCreateEventInput = {
  title: string;
  slug?: string;
  type: string;
  summary?: string;
  description?: string;
  venue: string;
  startAt: Date;
  endAt: Date;
  timezone?: string;
  capacity?: number;
  status?: AdminEventStatusInput;
  lifecycle?: AdminEventLifecycleInput;
  heroImage?: string;
  heroImageMeta?: EventMediaMetadata;
  highlights?: string[];
  lineup?: AdminEventLineupInput[];
  supportedBy?: string[];
  displayOrder?: number;
};

export type AdminUpdateEventInput = Partial<AdminCreateEventInput>;

export type AdminCreateTicketTierInput = {
  name: string;
  slug?: string;
  description?: string;
  price: number;
  currency?: string;
  available: number;
  saleStartAt?: Date;
  saleEndAt?: Date;
  maxPerOrder?: number;
  displayOrder?: number;
  status?: AdminTicketTierStatusInput;
  perks?: string[];
};

export type AdminUpdateTicketTierInput = Partial<AdminCreateTicketTierInput>;
