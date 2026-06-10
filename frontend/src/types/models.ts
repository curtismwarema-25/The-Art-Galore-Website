export type UserRole = "admin" | "staff" | "moderator" | "public";

export type RecordStatus = "draft" | "published" | "archived" | "cancelled";
export type EventPhase = "upcoming" | "past";
export type EventLifecycle = "draft" | EventPhase | "cancelled";

export type PaymentStatus = "idle" | "initiating" | "pending" | "paid" | "failed" | "refunded";
export type OrderStatus =
  | "pending_payment"
  | "payment_submitted"
  | "payment_verified"
  | "payment_rejected"
  | "paid"
  | "expired";
export type TicketDeliveryStatus = "pending" | "sent" | "failed";
export type CheckInStatus = "checked-in" | "not-checked-in";
export type ModerationStatus = "pending" | "approved" | "rejected";
export type UploadState = "idle" | "uploading" | "uploaded" | "failed";
export type PersonCategory = "leadership" | "member";
export type PartnerVisibility = "homepage" | "directory-only";

export interface BaseRecord {
  id: string;
  slug: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaMetadata {
  storageKey?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  url?: string;
  alt?: string;
}

export interface PersonSocials {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  x?: string;
  youtube?: string;
  website?: string;
}

export interface PersonRecord extends BaseRecord {
  status: RecordStatus;
  name: string;
  preferredName?: string;
  pronunciation?: string;
  role: string;
  category: PersonCategory;
  isArtist: boolean;
  image: string;
  imageMeta?: MediaMetadata;
  coverImage?: string;
  coverImageMeta?: MediaMetadata;
  shortBio?: string;
  bio: string;
  quote?: string;
  artistStatement?: string;
  socials: PersonSocials;
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
  email?: string;
  phone?: string;
  preferredContactMethod?: string;
  consentGiven?: boolean;
  importedFrom?: string;
  importNotes?: string;
}

export interface PartnerRecord extends BaseRecord {
  status: RecordStatus;
  name: string;
  logoText: string;
  logoMeta?: MediaMetadata;
  description: string;
  partnershipType: string;
  website?: string;
  showOnHomepage: boolean;
  visibility?: PartnerVisibility;
}

export interface TicketTier extends BaseRecord {
  status: RecordStatus;
  eventId: string;
  name: string;
  description?: string;
  price: number;
  currency: "KES";
  perks: string[];
  available: number;
  saleStartAt?: string;
  saleEndAt?: string;
  maxPerOrder?: number;
}

export interface EventLineupItem {
  id: string;
  personId?: string;
  name: string;
  role: string;
  image?: string;
}

export interface EventRecord extends BaseRecord {
  status: RecordStatus;
  title: string;
  type: string;
  phase: EventPhase;
  lifecycle: EventLifecycle;
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
  heroImageMeta?: MediaMetadata;
  supportedBy: string[];
  highlights: string[];
  lineup: EventLineupItem[];
}

export interface BuyerProfile extends BaseRecord {
  status: RecordStatus;
  name: string;
  phone: string;
  email?: string;
}

export interface PaymentProviderMetadata {
  provider: "mpesa" | "card" | "bank" | "manual";
  providerReference?: string;
  resultCode?: string;
  resultMessage?: string;
  initiatedAt?: string;
  paidAt?: string;
}

export interface OrderRecord extends BaseRecord {
  status: OrderStatus;
  eventId: string;
  buyerId: string;
  tierId: string;
  quantity: number;
  amount: number;
  currency: "KES";
  paymentReference: string;
  paymentStatus: PaymentStatus;
  ticketDeliveryStatus: TicketDeliveryStatus;
  checkedInStatus: CheckInStatus;
  payment: PaymentProviderMetadata;
}

export interface CheckInMetadata {
  checkedInAt?: string;
  checkedInBy?: string;
  checkInMethod?: "qr" | "manual";
}

export interface TicketRecord extends BaseRecord {
  status: RecordStatus;
  orderId: string;
  eventId: string;
  buyerId: string;
  qrCodeValue: string;
  quantity: number;
  tierId: string;
  paymentStatus: PaymentStatus;
  checkedInStatus: CheckInStatus;
  checkIn: CheckInMetadata;
}

export interface GalleryImage extends BaseRecord {
  status: RecordStatus;
  eventId: string;
  image: string;
  media: MediaMetadata;
  caption: string;
  featured: boolean;
  sortOrder: number;
  uploadState: UploadState;
}

export interface CommunityUpload extends BaseRecord {
  eventId: string;
  alias: string;
  image: string;
  media: MediaMetadata;
  status: ModerationStatus;
  submitterEmail?: string;
  submitterPhone?: string;
  consentGiven?: boolean;
  moderationNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewHistory?: Array<{
    id: string;
    decision: Exclude<ModerationStatus, "pending">;
    notes?: string;
    reviewedAt: string;
    reviewerId: string;
    reviewerName: string;
  }>;
  submittedAt: string;
}

export interface SiteSettings extends BaseRecord {
  status: RecordStatus;
  siteName: string;
  tagline: string;
  footerText: string;
  contactEmail: string;
  contactPhone: string;
  whatsappLink: string;
  instagram: string;
  tiktok: string;
  x: string;
  facebook: string;
  heroTitle: string;
  heroSubtitle: string;
  featuredEventId: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  defaultSocialPreviewImage: string;
  privacyPolicyLink: string;
  termsLink: string;
  refundPolicyLink: string;
  manualPaymentEnabled: boolean;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankBranch?: string;
  mpesaPaybill?: string;
  mpesaAccountInstructions?: string;
  supportContactText?: string;
  mpesaComingSoonMessage: string;
}

export interface DashboardStats {
  upcomingEventsCount: number;
  pastEventsCount: number;
  ticketsSold: number;
  paidOrders: number;
  pendingOrders: number;
  pendingUploads: number;
  artistsCount: number;
  partnersCount: number;
  generatedAt: string;
}

export interface ApiListResponse<T> {
  items: T[];
  total: number;
}
