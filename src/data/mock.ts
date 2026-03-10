import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";
import brysonWafulaImage from "@/assets/bryson-wafula.heic";
import johnSaruniImage from "@/assets/john-saruni.heic";
import kebabeImage from "@/assets/kebabe.heic";
import paintingShot from "@/assets/painting-shot.heic";
import paintingShot2 from "@/assets/painting-shot-2.heic";
import paintingShot3 from "@/assets/painting-shot-3.heic";
import paintingShot4 from "@/assets/painting-shot-4.heic";
import { people } from "@/data/people";
import { partners } from "@/data/partners";
import type {
  BuyerProfile,
  CommunityUpload,
  DashboardStats,
  EventRecord,
  GalleryImage,
  OrderRecord,
  SiteSettings,
  TicketRecord,
  TicketTier,
} from "@/types/models";

const baseTimestamp = "2026-03-08T00:00:00Z";

export const mockEvents: EventRecord[] = [
  {
    id: "event-1",
    slug: "sip-paint-sunset-edition",
    title: "Sip & Paint: Sunset Edition",
    type: "Sip & Paint",
    summary: "An intimate guided painting evening with music, drinks, and collaborative art moments.",
    description:
      "Presented by Art Galore International, this guided painting evening brings artists, first-timers, and art lovers together for a social creative experience.",
    date: "2026-03-15",
    time: "6:00 PM - 9:00 PM",
    startAt: "2026-03-15T18:00:00+03:00",
    endAt: "2026-03-15T21:00:00+03:00",
    timezone: "Africa/Nairobi",
    venue: "The Yard, Kisii Town",
    capacity: 40,
    heroImage: paintingShot,
    phase: "upcoming",
    lifecycle: "upcoming",
    status: "published",
    supportedBy: ["Kisii Cultural Center", "Creative Futures Trust"],
    highlights: ["Live guided canvas session", "Community art wall", "Curated DJ set"],
    lineup: [
      { id: "lineup-1", personId: "anthony-kebabe", name: "Anthony Kebabe", role: "Host", image: kebabeImage },
      { id: "lineup-2", personId: "violet-kwamboka", name: "Violet Kwamboka", role: "Creative Direction", image: artist2 },
      { id: "lineup-3", personId: "bryson-wafula", name: "Bryson Wafula", role: "Experience Producer", image: brysonWafulaImage },
    ],
    displayOrder: 1,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    id: "event-2",
    slug: "art-night-vol-4",
    title: "Art Night Vol. 4",
    type: "Art Night",
    summary: "Gallery walk, live art, poetry, and conversation designed for creative community connection.",
    description:
      "Art Night Vol. 4 explores storytelling through mixed-media performances, visual installations, and audience participation.",
    date: "2026-04-05",
    time: "7:00 PM - 11:00 PM",
    startAt: "2026-04-05T19:00:00+03:00",
    endAt: "2026-04-05T23:00:00+03:00",
    timezone: "Africa/Nairobi",
    venue: "Rooftop Gallery, Kisii",
    capacity: 120,
    heroImage: paintingShot2,
    phase: "upcoming",
    lifecycle: "upcoming",
    status: "published",
    supportedBy: ["Urban Canvas Co.", "Palette Media"],
    highlights: ["Live artist showcase", "Open mic session", "Late-night visual archive"],
    lineup: [
      { id: "lineup-4", personId: "kelvin-ndola", name: "Kelvin Ndola", role: "Community Lead", image: artist1 },
      { id: "lineup-5", personId: "boaz-omondi", name: "Boaz Omondi", role: "Logistics Direction", image: artist2 },
      { id: "lineup-6", personId: "michele-ratemo", name: "Michele Ratemo", role: "Program Coordination", image: artist3 },
    ],
    displayOrder: 2,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    id: "event-3",
    slug: "pajama-night-late-edition",
    title: "Pajama Night: Late Edition",
    type: "Pajama Night",
    summary: "A cozy late-night studio format for collaborative painting, conversations, and creative play.",
    description:
      "Pajama Night creates a relaxed artistic space with low-pressure prompts, soft music, and community-driven expression.",
    date: "2026-04-26",
    time: "8:00 PM - 12:00 AM",
    startAt: "2026-04-26T20:00:00+03:00",
    endAt: "2026-04-27T00:00:00+03:00",
    timezone: "Africa/Nairobi",
    venue: "Studio 7, Kisii Town",
    capacity: 70,
    heroImage: paintingShot3,
    phase: "upcoming",
    lifecycle: "upcoming",
    status: "published",
    supportedBy: ["East Africa Arts Network"],
    highlights: ["Comfort-first creative setup", "Late-night sketch circle", "Collaborative mural wall"],
    lineup: [
      { id: "lineup-7", personId: "maxwell-njoroge", name: "Maxwell Njoroge", role: "Artist Facilitator", image: artist1 },
      { id: "lineup-8", personId: "mercy-ogato", name: "Mercy Ogato", role: "Creative Host", image: artist2 },
    ],
    displayOrder: 3,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    id: "event-4",
    slug: "collective-canvas-lab",
    title: "Collective Canvas Lab",
    type: "Workshop",
    summary: "A past workshop focused on collaborative art-making and shared storytelling methods.",
    description:
      "This workshop brought artists and attendees together to co-create thematic pieces exploring memory and belonging.",
    date: "2025-11-22",
    time: "2:00 PM - 6:00 PM",
    startAt: "2025-11-22T14:00:00+03:00",
    endAt: "2025-11-22T18:00:00+03:00",
    timezone: "Africa/Nairobi",
    venue: "Studio Courtyard, Kisii",
    capacity: 55,
    heroImage: paintingShot4,
    phase: "past",
    lifecycle: "past",
    status: "published",
    supportedBy: ["Creative Futures Trust"],
    highlights: ["Collaborative canvases", "Archive wall", "Community storytelling session"],
    lineup: [
      { id: "lineup-9", personId: "john-saruni", name: "John Saruni", role: "Workshop Guide", image: johnSaruniImage },
      { id: "lineup-10", personId: "martha", name: "Martha", role: "Community Artist", image: artist2 },
    ],
    displayOrder: 4,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
];

export const mockTicketTiers: TicketTier[] = [
  { id: "tier-1", slug: "event-1-early-bird", eventId: "event-1", name: "Early Bird", price: 1200, currency: "KES", perks: ["Canvas", "2 Drinks", "Art Kit"], available: 8, maxPerOrder: 4, status: "published", displayOrder: 1, createdAt: baseTimestamp, updatedAt: baseTimestamp },
  { id: "tier-2", slug: "event-1-standard", eventId: "event-1", name: "Standard", price: 1500, currency: "KES", perks: ["Canvas", "1 Drink", "Art Kit"], available: 24, maxPerOrder: 6, status: "published", displayOrder: 2, createdAt: baseTimestamp, updatedAt: baseTimestamp },
  { id: "tier-3", slug: "event-1-vip", eventId: "event-1", name: "VIP", price: 2500, currency: "KES", perks: ["Premium Canvas", "Unlimited Drinks", "Priority Seating"], available: 6, maxPerOrder: 2, status: "published", displayOrder: 3, createdAt: baseTimestamp, updatedAt: baseTimestamp },
  { id: "tier-4", slug: "event-2-general", eventId: "event-2", name: "General", price: 2000, currency: "KES", perks: ["Entry", "Program Guide"], available: 74, maxPerOrder: 5, status: "published", displayOrder: 1, createdAt: baseTimestamp, updatedAt: baseTimestamp },
];

export const mockBuyers: BuyerProfile[] = [
  { id: "buyer-1", slug: "sam-o", name: "Sam O.", phone: "+254712111111", email: "sam@example.com", status: "published", displayOrder: 1, createdAt: baseTimestamp, updatedAt: baseTimestamp },
  { id: "buyer-2", slug: "linet-m", name: "Linet M.", phone: "+254733222222", email: "linet@example.com", status: "published", displayOrder: 2, createdAt: baseTimestamp, updatedAt: baseTimestamp },
  { id: "buyer-3", slug: "brian-t", name: "Brian T.", phone: "+254701333333", email: "brian@example.com", status: "published", displayOrder: 3, createdAt: baseTimestamp, updatedAt: baseTimestamp },
];

export const mockOrders: OrderRecord[] = [
  {
    id: "ORD-1201",
    slug: "ord-1201",
    eventId: "event-1",
    buyerId: "buyer-1",
    tierId: "tier-2",
    quantity: 2,
    amount: 3000,
    currency: "KES",
    paymentReference: "MPESA-XYZ-1201",
    paymentStatus: "paid",
    status: "paid",
    ticketDeliveryStatus: "sent",
    checkedInStatus: "checked-in",
    payment: {
      provider: "mpesa",
      providerReference: "MPESA-XYZ-1201",
      paidAt: "2026-03-01T10:45:00Z",
      initiatedAt: "2026-03-01T10:30:00Z",
    },
    displayOrder: 1,
    createdAt: "2026-03-01T10:30:00Z",
    updatedAt: "2026-03-01T10:45:00Z",
  },
  {
    id: "ORD-1202",
    slug: "ord-1202",
    eventId: "event-2",
    buyerId: "buyer-2",
    tierId: "tier-4",
    quantity: 1,
    amount: 2000,
    currency: "KES",
    paymentReference: "MPESA-XYZ-1202",
    paymentStatus: "paid",
    status: "paid",
    ticketDeliveryStatus: "sent",
    checkedInStatus: "not-checked-in",
    payment: {
      provider: "mpesa",
      providerReference: "MPESA-XYZ-1202",
      paidAt: "2026-03-02T13:13:00Z",
      initiatedAt: "2026-03-02T13:11:00Z",
    },
    displayOrder: 2,
    createdAt: "2026-03-02T13:11:00Z",
    updatedAt: "2026-03-02T13:13:00Z",
  },
  {
    id: "ORD-1203",
    slug: "ord-1203",
    eventId: "event-3",
    buyerId: "buyer-3",
    tierId: "tier-2",
    quantity: 1,
    amount: 1500,
    currency: "KES",
    paymentReference: "MPESA-XYZ-1203",
    paymentStatus: "pending",
    status: "pending",
    ticketDeliveryStatus: "pending",
    checkedInStatus: "not-checked-in",
    payment: {
      provider: "mpesa",
      providerReference: "MPESA-XYZ-1203",
      initiatedAt: "2026-03-04T15:44:00Z",
    },
    displayOrder: 3,
    createdAt: "2026-03-04T15:44:00Z",
    updatedAt: "2026-03-04T15:44:00Z",
  },
];

export const mockTickets: TicketRecord[] = [
  {
    id: "TKT-9001",
    slug: "tkt-9001",
    orderId: "ORD-1201",
    eventId: "event-1",
    buyerId: "buyer-1",
    qrCodeValue: "https://tickets.artgaloreinternational.org/TKT-9001",
    quantity: 2,
    tierId: "tier-2",
    paymentStatus: "paid",
    checkedInStatus: "checked-in",
    checkIn: {
      checkedInAt: "2026-03-15T15:55:00Z",
      checkedInBy: "gate-staff-1",
      checkInMethod: "qr",
    },
    status: "published",
    displayOrder: 1,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
];

export const mockGalleryImages: GalleryImage[] = [
  { id: "img-1", slug: "img-1", eventId: "event-1", image: paintingShot, media: { storageKey: "gallery/img-1.heic", mimeType: "image/heic" }, caption: "Warm-up strokes at sunset", featured: true, sortOrder: 1, uploadState: "uploaded", status: "published", displayOrder: 1, createdAt: baseTimestamp, updatedAt: baseTimestamp },
  { id: "img-2", slug: "img-2", eventId: "event-1", image: paintingShot2, media: { storageKey: "gallery/img-2.heic", mimeType: "image/heic" }, caption: "Community wall in progress", featured: false, sortOrder: 2, uploadState: "uploaded", status: "published", displayOrder: 2, createdAt: baseTimestamp, updatedAt: baseTimestamp },
  { id: "img-3", slug: "img-3", eventId: "event-2", image: paintingShot3, media: { storageKey: "gallery/img-3.heic", mimeType: "image/heic" }, caption: "Live painting performance", featured: true, sortOrder: 1, uploadState: "uploaded", status: "published", displayOrder: 3, createdAt: baseTimestamp, updatedAt: baseTimestamp },
  { id: "img-4", slug: "img-4", eventId: "event-4", image: paintingShot4, media: { storageKey: "gallery/img-4.heic", mimeType: "image/heic" }, caption: "Archive from Collective Canvas Lab", featured: false, sortOrder: 1, uploadState: "uploaded", status: "published", displayOrder: 4, createdAt: baseTimestamp, updatedAt: baseTimestamp },
];

export const mockCommunityUploads: CommunityUpload[] = [
  { id: "upload-1", slug: "upload-1", eventId: "event-1", alias: "Moraa K.", image: paintingShot2, media: { storageKey: "uploads/upload-1.heic", mimeType: "image/heic" }, status: "approved", submittedAt: "2026-03-01T11:30:00Z", reviewedBy: "moderator-1", reviewedAt: "2026-03-01T13:30:00Z", displayOrder: 1, createdAt: baseTimestamp, updatedAt: baseTimestamp },
  { id: "upload-2", slug: "upload-2", eventId: "event-2", alias: "Anonymous", image: paintingShot3, media: { storageKey: "uploads/upload-2.heic", mimeType: "image/heic" }, status: "pending", submittedAt: "2026-03-03T17:00:00Z", displayOrder: 2, createdAt: baseTimestamp, updatedAt: baseTimestamp },
  { id: "upload-3", slug: "upload-3", eventId: "event-3", alias: "Gesare M.", image: paintingShot4, media: { storageKey: "uploads/upload-3.heic", mimeType: "image/heic" }, status: "rejected", submittedAt: "2026-03-05T10:15:00Z", moderationNotes: "Image blur too strong", reviewedBy: "moderator-1", reviewedAt: "2026-03-05T12:00:00Z", displayOrder: 3, createdAt: baseTimestamp, updatedAt: baseTimestamp },
];

export const mockSiteSettings: SiteSettings = {
  id: "site-settings",
  slug: "site-settings",
  status: "published",
  displayOrder: 1,
  siteName: "Art Galore International",
  tagline: "Where Art Comes Alive",
  footerText: "Art Galore International creates immersive art experiences and community-centered collaborations.",
  contactEmail: "hello@artgaloreinternational.org",
  contactPhone: "+254 700 000 000",
  whatsappLink: "https://wa.me/254711000000",
  instagram: "https://instagram.com/artgaloreinternational",
  tiktok: "https://tiktok.com/@artgaloreinternational",
  x: "https://x.com/artgaloreintl",
  facebook: "https://facebook.com/artgaloreinternational",
  heroTitle: "Where Art Comes Alive",
  heroSubtitle: "Immersive events, shared creativity, and community-centered cultural experiences.",
  featuredEventId: "event-1",
  defaultMetaTitle: "Art Galore International | Immersive Art Experiences",
  defaultMetaDescription: "Discover events, artists, galleries, and collaborations with Art Galore International.",
  defaultSocialPreviewImage: "/og-image.jpg",
  privacyPolicyLink: "/privacy-policy",
  termsLink: "/terms-of-use",
  refundPolicyLink: "/ticket-refund-policy",
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
};

export const mockDashboardStats: DashboardStats = {
  upcomingEventsCount: mockEvents.filter((item) => item.phase === "upcoming").length,
  pastEventsCount: mockEvents.filter((item) => item.phase === "past").length,
  ticketsSold: mockOrders.reduce((total, order) => total + order.quantity, 0),
  paidOrders: mockOrders.filter((order) => order.paymentStatus === "paid").length,
  pendingOrders: mockOrders.filter((order) => order.paymentStatus === "pending").length,
  pendingUploads: mockCommunityUploads.filter((upload) => upload.status === "pending").length,
  artistsCount: people.filter((person) => person.isArtist).length,
  partnersCount: partners.length,
  generatedAt: baseTimestamp,
};

export const mockChartSeries = {
  ticketSalesOverTime: [
    { label: "Week 1", value: 34 },
    { label: "Week 2", value: 49 },
    { label: "Week 3", value: 42 },
    { label: "Week 4", value: 67 },
  ],
  attendanceTrends: [
    { label: "Sip & Paint", value: 38 },
    { label: "Art Night", value: 92 },
    { label: "Pajama Night", value: 61 },
  ],
  uploadsByEvent: [
    { label: "Sip & Paint", value: 18 },
    { label: "Art Night", value: 24 },
    { label: "Pajama Night", value: 9 },
  ],
};
