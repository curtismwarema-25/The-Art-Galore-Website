import {
  EventStatus,
  PartnerPlacementContext,
  TicketTierStatus,
  type CommunityUpload,
  type Event,
  type EventHighlight,
  type EventLineupItem,
  type GalleryImage,
  type Partner,
  type PartnerPlacement,
  type Person,
  type TicketTier,
  type TicketTierPerk,
} from "@prisma/client";
import { ValidationError, NotFoundError } from "../../common/errors/httpErrors.js";
import { slugify } from "../../common/utils/slug.js";
import {
  EventsRepository,
  type AdminEventsListFilters,
  type EventLineupInput,
  type EventWriteInput,
  type EventsListFilters,
  type TicketTierWriteInput,
} from "./events.repository.js";
import { cleanupReplacedMedia } from "../media/mediaLifecycle.js";
import type {
  AdminCreateEventInput,
  AdminCreateTicketTierInput,
  AdminUpdateEventInput,
  AdminUpdateTicketTierInput,
  PublicCommunityUpload,
  PublicEventDetailRecord,
  PublicEventRecord,
  PublicGalleryImage,
  PublicTicketTier,
  SerializedEventDetailRecord,
  SerializedEventRecord,
  SerializedTicketTierRecord,
} from "./events.types.js";

type EventWithPublicRelations = Event & {
  highlights: EventHighlight[];
  lineupItems: Array<EventLineupItem & { person: Pick<Person, "id" | "fullName" | "profileImageUrl"> | null }>;
  partnerPlacements: Array<PartnerPlacement & { partner: Pick<Partner, "name"> }>;
};

type EventWithDetailRelations = EventWithPublicRelations & {
  ticketTiers: Array<TicketTier & { perks: TicketTierPerk[] }>;
  galleryImages: GalleryImage[];
  communityUploads: CommunityUpload[];
};

type TicketTierWithPerks = TicketTier & {
  perks: TicketTierPerk[];
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toDisplayTimeRange(startAt: Date, endAt: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-KE", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  });

  return `${formatter.format(startAt)} - ${formatter.format(endAt)}`;
}

function mapEventStatus(status: EventStatus): SerializedEventRecord["status"] {
  if (status === EventStatus.DRAFT) return "draft";
  if (status === EventStatus.ARCHIVED) return "archived";
  if (status === EventStatus.CANCELLED) return "cancelled";
  return "published";
}

function mapTicketTierStatus(status: TicketTierStatus): SerializedTicketTierRecord["status"] {
  if (status === TicketTierStatus.DRAFT) return "draft";
  if (status === TicketTierStatus.ARCHIVED) return "archived";
  return "published";
}

function parseEventStatus(status?: string, lifecycle?: string): EventStatus {
  if (status === "draft") return EventStatus.DRAFT;
  if (status === "cancelled") return EventStatus.CANCELLED;
  if (status === "archived") return EventStatus.ARCHIVED;
  if (status === "published") return EventStatus.PUBLISHED;

  if (lifecycle === "draft") return EventStatus.DRAFT;
  if (lifecycle === "cancelled") return EventStatus.CANCELLED;

  return EventStatus.PUBLISHED;
}

function parseTicketTierStatus(status?: string): TicketTierStatus {
  if (status === "draft") return TicketTierStatus.DRAFT;
  if (status === "archived") return TicketTierStatus.ARCHIVED;
  return TicketTierStatus.ACTIVE;
}

function mapGalleryImage(image: GalleryImage): PublicGalleryImage {
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

function mapCommunityUpload(upload: CommunityUpload): PublicCommunityUpload {
  return {
    id: upload.id,
    slug: upload.id,
    eventId: upload.eventId,
    alias: upload.alias,
    image: upload.imageUrl,
    media: {
      storageKey: upload.storageKey,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes ?? undefined,
      width: upload.width ?? undefined,
      height: upload.height ?? undefined,
      url: upload.imageUrl,
    },
    status:
      upload.status === "APPROVED" ? "approved" : upload.status === "REJECTED" ? "rejected" : "pending",
    submittedAt: upload.submittedAt.toISOString(),
    reviewedAt: upload.lastReviewedAt?.toISOString(),
    displayOrder: 0,
    createdAt: upload.createdAt.toISOString(),
    updatedAt: upload.updatedAt.toISOString(),
  };
}

function mapEventRecord(event: EventWithPublicRelations): SerializedEventRecord {
  const now = new Date();
  const phase: SerializedEventRecord["phase"] = event.endAt < now ? "past" : "upcoming";
  const lifecycle: SerializedEventRecord["lifecycle"] =
    event.status === EventStatus.DRAFT
      ? "draft"
      : event.status === EventStatus.CANCELLED
        ? "cancelled"
        : phase;

  return {
    id: event.id,
    slug: event.slug,
    status: mapEventStatus(event.status),
    title: event.title,
    type: event.eventType,
    phase,
    lifecycle,
    summary: event.summary,
    description: event.description,
    date: toIsoDate(event.startAt),
    time: toDisplayTimeRange(event.startAt, event.endAt, event.timezone),
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    timezone: event.timezone,
    venue: event.venueName,
    capacity: event.capacity ?? 0,
    heroImage: event.heroImageUrl ?? "/og-image.jpg",
    heroImageMeta: event.heroStorageKey
      ? {
          storageKey: event.heroStorageKey,
          mimeType: event.heroMimeType ?? undefined,
          sizeBytes: event.heroSizeBytes ?? undefined,
          width: event.heroWidth ?? undefined,
          height: event.heroHeight ?? undefined,
          url: event.heroImageUrl ?? undefined,
        }
      : undefined,
    supportedBy: event.partnerPlacements
      .filter((placement) => placement.context === PartnerPlacementContext.EVENT)
      .map((placement) => placement.partner.name),
    highlights: event.highlights.map((highlight) => highlight.text),
    lineup: event.lineupItems.map((item) => ({
      id: item.id,
      personId: item.personId ?? undefined,
      name: item.displayName,
      role: item.roleLabel,
      image: item.person?.profileImageUrl ?? undefined,
    })),
    displayOrder: event.displayOrder,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

function mapTicketTier(tier: TicketTierWithPerks): SerializedTicketTierRecord {
  return {
    id: tier.id,
    slug: tier.slug,
    eventId: tier.eventId,
    status: mapTicketTierStatus(tier.status),
    name: tier.name,
    description: tier.description ?? undefined,
    price: Number(tier.price),
    currency: "KES",
    perks: tier.perks.map((perk) => perk.label),
    available: tier.availableQuantity,
    saleStartAt: tier.saleStartAt?.toISOString(),
    saleEndAt: tier.saleEndAt?.toISOString(),
    maxPerOrder: tier.maxPerOrder ?? undefined,
    displayOrder: tier.sortOrder,
    createdAt: tier.createdAt.toISOString(),
    updatedAt: tier.updatedAt.toISOString(),
  };
}

function normalizeHighlights(input?: string[]) {
  return (input ?? []).map((item) => item.trim()).filter(Boolean);
}

function normalizePerks(input?: string[]) {
  return (input ?? []).map((item) => item.trim()).filter(Boolean);
}

export class EventsService {
  constructor(private readonly repository: EventsRepository = new EventsRepository()) {}

  async listPublicEvents(filters: EventsListFilters) {
    const records = await this.repository.listPublicEvents(filters);
    return records.map((record) => mapEventRecord(record as EventWithPublicRelations));
  }

  async getPublicEventBySlug(slug: string) {
    const event = await this.repository.getPublicEventBySlug(slug);

    if (!event) {
      throw new NotFoundError("Event not found");
    }

    const record = event as EventWithDetailRelations;

    return {
      ...mapEventRecord(record),
      ticketTiers: record.ticketTiers.map((tier) => mapTicketTier(tier as TicketTierWithPerks)),
      galleryImages: record.galleryImages.map(mapGalleryImage),
      approvedUploads: record.communityUploads.map(mapCommunityUpload),
    } satisfies PublicEventDetailRecord;
  }

  async listAdminEvents(filters: AdminEventsListFilters) {
    const records = await this.repository.listAdminEvents(filters);
    return records.map((record) => mapEventRecord(record as EventWithPublicRelations));
  }

  async getAdminEventById(id: string) {
    const event = await this.repository.getAdminEventById(id);

    if (!event) {
      throw new NotFoundError("Event not found");
    }

    const record = event as EventWithDetailRelations;

    return {
      ...mapEventRecord(record),
      ticketTiers: record.ticketTiers.map((tier) => mapTicketTier(tier as TicketTierWithPerks)),
      galleryImages: record.galleryImages.map(mapGalleryImage),
      approvedUploads: record.communityUploads
        .filter((upload) => upload.status === "APPROVED")
        .map(mapCommunityUpload),
    } satisfies SerializedEventDetailRecord;
  }

  private async getUniqueEventSlug(title: string, inputSlug?: string, excludeId?: string) {
    const baseSlug = slugify(inputSlug?.trim() || title);
    if (!baseSlug) {
      throw new ValidationError("Unable to generate event slug");
    }

    let candidate = baseSlug;
    let counter = 2;

    while (await this.repository.findEventBySlug(candidate, excludeId)) {
      candidate = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return candidate;
  }

  private async normalizeLineup(lineup?: AdminCreateEventInput["lineup"] | AdminUpdateEventInput["lineup"]) {
    if (!lineup) return undefined;

    const cleaned = lineup.map((item) => ({
      personId: item.personId?.trim() || undefined,
      name: item.name.trim(),
      role: item.role.trim(),
    }));

    const personIds = cleaned.map((item) => item.personId).filter(Boolean) as string[];
    const existingPersonIds = new Set(await this.repository.findExistingPersonIds(personIds));

    return cleaned.map((item) => ({
      ...item,
      personId: item.personId && existingPersonIds.has(item.personId) ? item.personId : undefined,
    })) satisfies EventLineupInput[];
  }

  async createAdminEvent(input: AdminCreateEventInput) {
    if (input.endAt <= input.startAt) {
      throw new ValidationError("endAt must be after startAt");
    }

    const slug = await this.getUniqueEventSlug(input.title, input.slug);

    const createdEventId = await this.repository.createEvent({
      slug,
      title: input.title.trim(),
      eventType: input.type.trim(),
      summary: input.summary?.trim() || `${input.title.trim()} by Art Galore International.`,
      description: input.description?.trim() || `${input.title.trim()} event details will be expanded.`,
      startAt: input.startAt,
      endAt: input.endAt,
      timezone: input.timezone?.trim() || "Africa/Nairobi",
      venueName: input.venue.trim(),
      capacity: input.capacity,
      status: parseEventStatus(input.status, input.lifecycle),
      heroImageUrl: input.heroImage,
      heroStorageKey: input.heroImageMeta?.storageKey,
      heroMimeType: input.heroImageMeta?.mimeType,
      heroSizeBytes: input.heroImageMeta?.sizeBytes,
      heroWidth: input.heroImageMeta?.width,
      heroHeight: input.heroImageMeta?.height,
      displayOrder: input.displayOrder,
      highlights: normalizeHighlights(input.highlights),
      lineup: await this.normalizeLineup(input.lineup),
      supportedBy: input.supportedBy,
    } satisfies EventWriteInput);

    return this.getAdminEventById(createdEventId);
  }

  async updateAdminEvent(id: string, input: AdminUpdateEventInput) {
    const existing = await this.repository.findEventById(id);

    if (!existing) {
      throw new NotFoundError("Event not found");
    }

    const startAt = input.startAt ?? existing.startAt;
    const endAt = input.endAt ?? existing.endAt;

    if (endAt <= startAt) {
      throw new ValidationError("endAt must be after startAt");
    }

    const slug = input.slug || input.title ? await this.getUniqueEventSlug(input.title ?? existing.title, input.slug, id) : undefined;

    const previousHeroStorageKey = existing.heroStorageKey;
    const nextHeroStorageKey = input.heroImageMeta?.storageKey ?? previousHeroStorageKey;

    await this.repository.updateEvent(id, {
      slug,
      title: input.title?.trim(),
      eventType: input.type?.trim(),
      summary: input.summary?.trim(),
      description: input.description?.trim(),
      startAt: input.startAt,
      endAt: input.endAt,
      timezone: input.timezone?.trim(),
      venueName: input.venue?.trim(),
      capacity: input.capacity,
      status: input.status || input.lifecycle ? parseEventStatus(input.status, input.lifecycle) : undefined,
      heroImageUrl: input.heroImage,
      heroStorageKey: input.heroImageMeta?.storageKey,
      heroMimeType: input.heroImageMeta?.mimeType,
      heroSizeBytes: input.heroImageMeta?.sizeBytes,
      heroWidth: input.heroImageMeta?.width,
      heroHeight: input.heroImageMeta?.height,
      displayOrder: input.displayOrder,
      highlights: input.highlights ? normalizeHighlights(input.highlights) : undefined,
      lineup: input.lineup ? await this.normalizeLineup(input.lineup) : undefined,
      supportedBy: input.supportedBy,
    });
    await cleanupReplacedMedia(previousHeroStorageKey, nextHeroStorageKey);

    return this.getAdminEventById(id);
  }

  async archiveAdminEvent(id: string) {
    const existing = await this.repository.findEventById(id);

    if (!existing) {
      throw new NotFoundError("Event not found");
    }

    await this.repository.archiveEvent(id);
  }

  private async getUniqueTicketTierSlug(eventId: string, name: string, inputSlug?: string, excludeId?: string) {
    const baseSlug = slugify(inputSlug?.trim() || `${eventId}-${name}`);
    if (!baseSlug) {
      throw new ValidationError("Unable to generate ticket tier slug");
    }

    let candidate = baseSlug;
    let counter = 2;

    while (await this.repository.findTicketTierBySlug(candidate, excludeId)) {
      candidate = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return candidate;
  }

  async listAdminTicketTiers(eventId: string) {
    const event = await this.repository.findEventById(eventId);
    if (!event) throw new NotFoundError("Event not found");

    const tiers = await this.repository.listTicketTiersByEventId(eventId);
    return tiers.map((tier) => mapTicketTier(tier as TicketTierWithPerks));
  }

  async createAdminTicketTier(eventId: string, input: AdminCreateTicketTierInput) {
    const event = await this.repository.findEventById(eventId);
    if (!event) throw new NotFoundError("Event not found");

    if (input.saleStartAt && input.saleEndAt && input.saleEndAt <= input.saleStartAt) {
      throw new ValidationError("saleEndAt must be after saleStartAt");
    }

    const duplicateName = await this.repository.findTicketTierByName(eventId, input.name.trim());
    if (duplicateName) {
      throw new ValidationError("Ticket tier name already exists for this event");
    }

    const slug = await this.getUniqueTicketTierSlug(eventId, input.name, input.slug);

    const tierId = await this.repository.createTicketTier(eventId, {
      slug,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      price: input.price,
      currency: input.currency?.trim().toUpperCase() || "KES",
      availableQuantity: input.available,
      maxPerOrder: input.maxPerOrder,
      saleStartAt: input.saleStartAt,
      saleEndAt: input.saleEndAt,
      status: parseTicketTierStatus(input.status),
      sortOrder: input.displayOrder,
      perks: normalizePerks(input.perks),
    } satisfies TicketTierWriteInput);

    const created = await this.repository.getTicketTierById(tierId);
    if (!created) throw new NotFoundError("Ticket tier not found");

    return mapTicketTier(created as TicketTierWithPerks);
  }

  async updateAdminTicketTier(id: string, input: AdminUpdateTicketTierInput) {
    const existing = await this.repository.getTicketTierById(id);
    if (!existing) throw new NotFoundError("Ticket tier not found");

    const saleStartAt = input.saleStartAt ?? existing.saleStartAt ?? undefined;
    const saleEndAt = input.saleEndAt ?? existing.saleEndAt ?? undefined;

    if (saleStartAt && saleEndAt && saleEndAt <= saleStartAt) {
      throw new ValidationError("saleEndAt must be after saleStartAt");
    }

    if (input.name) {
      const duplicateName = await this.repository.findTicketTierByName(existing.eventId, input.name.trim(), id);
      if (duplicateName) {
        throw new ValidationError("Ticket tier name already exists for this event");
      }
    }

    const slug = input.slug || input.name ? await this.getUniqueTicketTierSlug(existing.eventId, input.name ?? existing.name, input.slug, id) : undefined;

    await this.repository.updateTicketTier(id, {
      slug,
      name: input.name?.trim(),
      description: input.description?.trim(),
      price: input.price,
      currency: input.currency?.trim().toUpperCase(),
      availableQuantity: input.available,
      maxPerOrder: input.maxPerOrder,
      saleStartAt: input.saleStartAt,
      saleEndAt: input.saleEndAt,
      status: input.status ? parseTicketTierStatus(input.status) : undefined,
      sortOrder: input.displayOrder,
      perks: input.perks ? normalizePerks(input.perks) : undefined,
    });

    const updated = await this.repository.getTicketTierById(id);
    if (!updated) throw new NotFoundError("Ticket tier not found");

    return mapTicketTier(updated as TicketTierWithPerks);
  }

  async archiveAdminTicketTier(id: string) {
    const existing = await this.repository.getTicketTierById(id);
    if (!existing) throw new NotFoundError("Ticket tier not found");

    await this.repository.archiveTicketTier(id);
  }
}
