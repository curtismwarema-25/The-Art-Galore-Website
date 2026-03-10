import type {
  EventStatus,
  PartnerPlacementContext,
  PartnerStatus,
  PersonRoleType,
  PersonStatus,
  TicketTierStatus,
  UserRole,
} from "@prisma/client";

export type SeedPerson = {
  slug: string;
  fullName: string;
  headline?: string;
  bio: string;
  medium?: string;
  status: PersonStatus;
  displayOrder?: number;
  roles: Array<{
    role: PersonRoleType;
    title?: string;
  }>;
  featuredWorks: Array<{
    title: string;
    description?: string;
    sortOrder?: number;
  }>;
};

export type SeedPartner = {
  slug: string;
  name: string;
  description: string;
  partnershipType?: string;
  website?: string;
  logoText?: string;
  status: PartnerStatus;
  displayOrder?: number;
  placements: Array<{
    context: PartnerPlacementContext;
    contextKey: string;
    eventSlug?: string;
    displayOrder?: number;
    isActive?: boolean;
  }>;
};

export type SeedTicketTier = {
  slug: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  availableQuantity: number;
  maxPerOrder?: number;
  saleStartAt?: string;
  saleEndAt?: string;
  status: TicketTierStatus;
  sortOrder?: number;
  perks: Array<{
    label: string;
    sortOrder?: number;
  }>;
};

export type SeedEvent = {
  slug: string;
  title: string;
  eventType: string;
  summary: string;
  description: string;
  startAt: string;
  endAt: string;
  timezone: string;
  venueName: string;
  capacity?: number;
  status: EventStatus;
  displayOrder?: number;
  highlights: Array<{
    text: string;
    sortOrder?: number;
  }>;
  lineup: Array<{
    personSlug?: string;
    displayName: string;
    roleLabel: string;
    sortOrder?: number;
  }>;
  supportedPartnerSlugs: string[];
  ticketTiers: SeedTicketTier[];
  galleryImages: Array<{
    caption: string;
    imageUrl: string;
    storageKey: string;
    mimeType: string;
    featured?: boolean;
    sortOrder?: number;
    isActive?: boolean;
  }>;
};

export type SeedSiteSettings = {
  settingsKey: string;
  siteName: string;
  tagline: string;
  footerText: string;
  contactEmail: string;
  contactPhone: string;
  whatsappLink: string;
  instagramUrl: string;
  tiktokUrl: string;
  xUrl: string;
  facebookUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  featuredEventSlug?: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  defaultSocialPreviewImageUrl: string;
  privacyPolicyLink: string;
  termsLink: string;
  refundPolicyLink: string;
};

export type SeedBundle = {
  people: SeedPerson[];
  partners: SeedPartner[];
  events: SeedEvent[];
  siteSettings: SeedSiteSettings;
};

export type SeedAdminUser = {
  enabled: boolean;
  email: string;
  fullName: string;
  role: UserRole;
  password: string;
};

export type SeedOptions = {
  adminUser: SeedAdminUser;
};
