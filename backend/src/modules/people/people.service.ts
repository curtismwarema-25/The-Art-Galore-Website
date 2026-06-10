import { PersonRoleType, PersonStatus, type Person, type PersonFeaturedWork, type PersonRole, type Prisma } from "@prisma/client";
import { NotFoundError, ValidationError } from "../../common/errors/httpErrors.js";
import { slugify } from "../../common/utils/slug.js";
import {
  PeopleRepository,
  type AdminPeopleListFilters,
  type PeopleListFilters,
  type PersonRoleInput,
  type PersonWriteInput,
} from "./people.repository.js";
import type {
  AdminCreatePersonInput,
  AdminPersonRecord,
  PersonEventParticipationInput,
  AdminUpdatePersonInput,
  PublicPersonRecord,
} from "./people.types.js";
import { cleanupReplacedMedia } from "../media/mediaLifecycle.js";

type PersonWithPublicRelations = Person & {
  roles: PersonRole[];
  featuredWorks: PersonFeaturedWork[];
  participations: Array<{ event: { id?: string; title: string } }>;
};

type CuratedImportMetadata = {
  socials?: PublicPersonRecord["socials"];
  eventsParticipatedRaw?: string[];
  eventRolesRaw?: string[];
  interestedInCollaborating?: boolean;
  additionalWorkUrl?: string | null;
  importNotes?: string | null;
  mediaReferences?: {
    profilePhotoUrl?: string | null;
    portfolioImagesUrl?: string | null;
  };
};

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function mapPersonStatus(status: PersonStatus): PublicPersonRecord["status"] {
  if (status === PersonStatus.DRAFT) return "draft";
  if (status === PersonStatus.ACTIVE) return "published";
  return "archived";
}

function parsePersonStatus(status?: "draft" | "published" | "archived"): PersonStatus {
  if (status === "draft") return PersonStatus.DRAFT;
  if (status === "archived") return PersonStatus.ARCHIVED;
  return PersonStatus.ACTIVE;
}

function toInitialRole(person: PersonWithPublicRelations) {
  const leadershipRole = person.roles.find((role) => role.role === PersonRoleType.LEADERSHIP);
  if (leadershipRole?.title) return leadershipRole.title;

  const memberRole = person.roles.find((role) => role.role === PersonRoleType.MEMBER);
  if (memberRole?.title) return memberRole.title;

  return person.headline ?? person.medium ?? "Collective Artist";
}

function asObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function getCuratedImportMetadata(person: PersonWithPublicRelations | (Person & { roles: PersonRole[] })): CuratedImportMetadata {
  const metadata = asObject(person.importMetadata);
  const curatedImport = asObject(metadata.curatedImport as Prisma.JsonValue | undefined);
  const rawSocials = asObject(curatedImport.socials as Prisma.JsonValue | undefined);
  const rawMedia = asObject(curatedImport.mediaReferences as Prisma.JsonValue | undefined);

  return {
    socials: {
      instagram: normalizeText(rawSocials.instagram as string | undefined),
      tiktok: normalizeText(rawSocials.tiktok as string | undefined),
      facebook: normalizeText(rawSocials.facebook as string | undefined),
      x: normalizeText(rawSocials.x as string | undefined),
      youtube: normalizeText(rawSocials.youtube as string | undefined),
      website: normalizeText(rawSocials.website as string | undefined),
    },
    eventsParticipatedRaw: asStringArray(curatedImport.eventsParticipatedRaw),
    eventRolesRaw: asStringArray(curatedImport.eventRolesRaw),
    interestedInCollaborating:
      typeof curatedImport.interestedInCollaborating === "boolean" ? curatedImport.interestedInCollaborating : undefined,
    additionalWorkUrl: normalizeText(curatedImport.additionalWorkUrl as string | undefined),
    importNotes: normalizeText(curatedImport.importNotes as string | undefined),
    mediaReferences: {
      profilePhotoUrl: normalizeText(
        typeof rawMedia.profilePhotoUrl === "string" ? rawMedia.profilePhotoUrl : undefined,
      ),
      portfolioImagesUrl: normalizeText(
        typeof rawMedia.portfolioImagesUrl === "string" ? rawMedia.portfolioImagesUrl : undefined,
      ),
    } as PublicPersonRecord["mediaReferences"],
  };
}

function buildImportMetadata(
  existing: Prisma.JsonValue | null | undefined,
  input: Pick<
    AdminCreatePersonInput,
    "socials" | "eventRoles" | "interestedInCollaborating" | "additionalWorkUrl" | "mediaReferences" | "importNotes"
  > & { importNotes?: string },
): Prisma.InputJsonValue | undefined {
  const hasMetadataInput =
    input.socials !== undefined ||
    input.eventRoles !== undefined ||
    input.interestedInCollaborating !== undefined ||
    input.additionalWorkUrl !== undefined ||
    input.mediaReferences !== undefined ||
    input.importNotes !== undefined;

  if (!hasMetadataInput) return undefined;

  const previous = asObject(existing);
  const previousCurated = asObject(previous.curatedImport as Prisma.JsonValue | undefined);

  return {
    ...previous,
    curatedImport: {
      ...previousCurated,
      socials: input.socials ?? (previousCurated.socials as Prisma.InputJsonValue),
      eventRolesRaw: input.eventRoles ?? (previousCurated.eventRolesRaw as Prisma.InputJsonValue),
      interestedInCollaborating: input.interestedInCollaborating ?? (previousCurated.interestedInCollaborating as Prisma.InputJsonValue),
      additionalWorkUrl: input.additionalWorkUrl ?? (previousCurated.additionalWorkUrl as Prisma.InputJsonValue),
      mediaReferences: input.mediaReferences ?? (previousCurated.mediaReferences as Prisma.InputJsonValue),
      importNotes: input.importNotes ?? (previousCurated.importNotes as Prisma.InputJsonValue),
    },
  } as Prisma.InputJsonValue;
}

function mapPersonRecord(person: PersonWithPublicRelations, includeAdminFields = false): PublicPersonRecord | AdminPersonRecord {
  const hasLeadershipRole = person.roles.some((role) => role.role === PersonRoleType.LEADERSHIP);
  const isArtist = person.roles.some((role) => role.role === PersonRoleType.ARTIST);
  const curatedImport = getCuratedImportMetadata(person);
  const linkedEvents = person.participations.map((participation) => participation.event.title);
  const record: PublicPersonRecord = {

    id: person.id,
    slug: person.slug,
    displayOrder: person.displayOrder,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
    status: mapPersonStatus(person.status),
    name: person.fullName,
    preferredName: person.preferredName ?? undefined,
    pronunciation: person.pronunciation ?? undefined,
    role: toInitialRole(person),
    category: hasLeadershipRole ? "leadership" : "member",
    isArtist,
    image: person.profileImageUrl ?? "/bg.jpg",
    imageMeta: person.profileStorageKey
      ? {
          storageKey: person.profileStorageKey,
          mimeType: person.profileMimeType ?? undefined,
          sizeBytes: person.profileSizeBytes ?? undefined,
          width: person.profileWidth ?? undefined,
          height: person.profileHeight ?? undefined,
          url: person.profileImageUrl ?? undefined,
        }
      : undefined,
    coverImage: person.coverImageUrl ?? undefined,
    coverImageMeta: person.coverStorageKey
      ? {
          storageKey: person.coverStorageKey,
          mimeType: person.coverMimeType ?? undefined,
          sizeBytes: person.coverSizeBytes ?? undefined,
          width: person.coverWidth ?? undefined,
          height: person.coverHeight ?? undefined,
          url: person.coverImageUrl ?? undefined,
        }
      : undefined,
    shortBio: person.shortBio ?? undefined,
    bio: person.bio,
    quote: person.quote ?? undefined,
    artistStatement: person.artistStatement ?? undefined,
    socials: curatedImport.socials ?? {},
    city: person.city ?? undefined,
    medium: person.medium ?? "Mixed Media",
    primaryArtForm: person.primaryArtForm ?? undefined,
    secondaryArtForm: person.secondaryArtForm ?? undefined,
    yearsPracticing: person.yearsPracticing ?? undefined,
    featuredWorks: person.featuredWorks.map((work) => work.title),
    eventsParticipated: linkedEvents.length > 0 ? linkedEvents : curatedImport.eventsParticipatedRaw ?? [],
    eventRoles: curatedImport.eventRolesRaw ?? [],
    interestedInCollaborating: curatedImport.interestedInCollaborating,
    additionalWorkUrl: curatedImport.additionalWorkUrl ?? undefined,
      mediaReferences: curatedImport.mediaReferences as PublicPersonRecord["mediaReferences"],
  };

  if (!includeAdminFields) return record;

  return {
    ...record,
    email: person.email ?? undefined,
    phone: person.phone ?? undefined,
    preferredContactMethod: person.preferredContactMethod ?? undefined,
    consentGiven: person.consentGiven ?? undefined,
    importedFrom: person.importedFrom ?? undefined,
    importNotes: curatedImport.importNotes ?? undefined,
  };
}

function normalizeFeaturedWorks(featuredWorks?: string[]) {
  return (featuredWorks ?? []).map((work) => work.trim()).filter(Boolean);
}

function getCategoryFromRoles(roles: PersonRole[]): "leadership" | "member" {
  return roles.some((role) => role.role === PersonRoleType.LEADERSHIP) ? "leadership" : "member";
}

function getIsArtistFromRoles(roles: PersonRole[]) {
  return roles.some((role) => role.role === PersonRoleType.ARTIST);
}

function getRoleTitleFromRoles(person: PersonWithPublicRelations | (Person & { roles: PersonRole[] })) {
  const leadershipRole = person.roles.find((role) => role.role === PersonRoleType.LEADERSHIP);
  if (leadershipRole?.title) return leadershipRole.title;

  const memberRole = person.roles.find((role) => role.role === PersonRoleType.MEMBER);
  if (memberRole?.title) return memberRole.title;

  return person.headline ?? person.medium ?? "Collective Artist";
}

export class PeopleService {
  constructor(private readonly repository: PeopleRepository = new PeopleRepository()) {}

  async listPublicPeople(filters: PeopleListFilters) {
    const people = await this.repository.listPublicPeople(filters);
    return people.map((person) => mapPersonRecord(person as PersonWithPublicRelations) as PublicPersonRecord);
  }

  async getPublicPersonBySlug(slug: string) {
    const person = await this.repository.getPublicPersonBySlug(slug);

    if (!person) {
      throw new NotFoundError("Person not found");
    }

    return mapPersonRecord(person as PersonWithPublicRelations) as PublicPersonRecord;
  }

  async listAdminPeople(filters: AdminPeopleListFilters) {
    const people = await this.repository.listAdminPeople(filters);
    return people.map((person) => mapPersonRecord(person as PersonWithPublicRelations, true) as AdminPersonRecord);
  }

  async getAdminPersonById(id: string) {
    const person = await this.repository.getAdminPersonById(id);

    if (!person) {
      throw new NotFoundError("Person not found");
    }

    return mapPersonRecord(person as PersonWithPublicRelations, true) as AdminPersonRecord;
  }

  private async getUniquePersonSlug(name: string, inputSlug?: string, excludeId?: string) {
    const baseSlug = slugify(inputSlug?.trim() || name);

    if (!baseSlug) {
      throw new ValidationError("Unable to generate person slug");
    }

    let candidate = baseSlug;
    let counter = 2;

    while (await this.repository.findPersonBySlug(candidate, excludeId)) {
      candidate = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return candidate;
  }

  private buildRoles(category: "leadership" | "member", isArtist: boolean, title: string): PersonRoleInput[] {
    const baseRole = category === "leadership" ? PersonRoleType.LEADERSHIP : PersonRoleType.MEMBER;
    const roles: PersonRoleInput[] = [
      {
        role: baseRole,
        title: title.trim(),
      },
    ];

    if (isArtist) {
      roles.push({
        role: PersonRoleType.ARTIST,
        title: "Artist",
      });
    }

    return roles;
  }

  private async normalizeEventParticipations(eventParticipations?: PersonEventParticipationInput[]) {
    if (!eventParticipations) return undefined;

    const uniqueByEventId = new Map<string, PersonEventParticipationInput>();

    for (const entry of eventParticipations) {
      const eventId = entry.eventId.trim();
      if (!eventId) continue;

      uniqueByEventId.set(eventId, {
        eventId,
        participationRole: entry.participationRole?.trim() || undefined,
      });
    }

    const normalized = Array.from(uniqueByEventId.values());
    const requestedIds = normalized.map((entry) => entry.eventId);
    const existingIds = new Set(await this.repository.findExistingEventIds(requestedIds));

    const missing = requestedIds.filter((id) => !existingIds.has(id));
    if (missing.length > 0) {
      throw new ValidationError("One or more event references are invalid", { missingEventIds: missing });
    }

    return normalized;
  }

  async createAdminPerson(input: AdminCreatePersonInput) {
    const slug = await this.getUniquePersonSlug(input.name, input.slug);

    const createdId = await this.repository.createPerson({
      slug,
      fullName: input.name.trim(),
      preferredName: normalizeText(input.preferredName),
      pronunciation: normalizeText(input.pronunciation),
      email: normalizeText(input.email)?.toLowerCase(),
      phone: normalizeText(input.phone),
      city: normalizeText(input.city),
      preferredContactMethod: normalizeText(input.preferredContactMethod),
      headline: input.role.trim(),
      shortBio: normalizeText(input.shortBio),
      bio: input.bio.trim(),
      quote: normalizeText(input.quote),
      artistStatement: normalizeText(input.artistStatement),
      medium: input.medium?.trim() || undefined,
      primaryArtForm: normalizeText(input.primaryArtForm),
      secondaryArtForm: normalizeText(input.secondaryArtForm),
      yearsPracticing: normalizeText(input.yearsPracticing),
      profileImageUrl: input.image,
      profileStorageKey: input.imageMeta?.storageKey,
      profileMimeType: input.imageMeta?.mimeType,
      profileSizeBytes: input.imageMeta?.sizeBytes,
      profileWidth: input.imageMeta?.width,
      profileHeight: input.imageMeta?.height,
      coverImageUrl: input.coverImage,
      coverStorageKey: input.coverImageMeta?.storageKey,
      coverMimeType: input.coverImageMeta?.mimeType,
      coverSizeBytes: input.coverImageMeta?.sizeBytes,
      coverWidth: input.coverImageMeta?.width,
      coverHeight: input.coverImageMeta?.height,
      displayOrder: input.displayOrder ?? 0,
      status: parsePersonStatus(input.status),
      consentGiven: input.consentGiven,
      importedFrom: normalizeText(input.importedFrom),
      importMetadata: buildImportMetadata(null, input),
      roles: this.buildRoles(input.category, input.isArtist, input.role),
      featuredWorks: normalizeFeaturedWorks(input.featuredWorks),
      eventParticipations: await this.normalizeEventParticipations(input.eventParticipations),
    } satisfies PersonWriteInput);

    return this.getAdminPersonById(createdId);
  }

  async updateAdminPerson(id: string, input: AdminUpdatePersonInput) {
    const existing = await this.repository.findPersonById(id);

    if (!existing) {
      throw new NotFoundError("Person not found");
    }

    const hasRoleUpdate = input.category !== undefined || input.isArtist !== undefined || input.role !== undefined;
    const nextCategory = input.category ?? getCategoryFromRoles(existing.roles);
    const nextIsArtist = input.isArtist ?? getIsArtistFromRoles(existing.roles);
    const nextTitle = input.role ?? getRoleTitleFromRoles(existing as PersonWithPublicRelations);
    const nextSlug = input.slug || input.name ? await this.getUniquePersonSlug(input.name ?? existing.fullName, input.slug, id) : undefined;
    const previousProfileStorageKey = existing.profileStorageKey;
    const previousCoverStorageKey = existing.coverStorageKey;
    const nextProfileStorageKey = input.imageMeta?.storageKey ?? previousProfileStorageKey;
    const nextCoverStorageKey = input.coverImageMeta?.storageKey ?? previousCoverStorageKey;

    await this.repository.updatePerson(id, {
      slug: nextSlug,
      fullName: input.name?.trim(),
      preferredName: normalizeText(input.preferredName),
      pronunciation: normalizeText(input.pronunciation),
      email: normalizeText(input.email)?.toLowerCase(),
      phone: normalizeText(input.phone),
      city: normalizeText(input.city),
      preferredContactMethod: normalizeText(input.preferredContactMethod),
      headline: input.role?.trim(),
      shortBio: normalizeText(input.shortBio),
      bio: input.bio?.trim(),
      quote: normalizeText(input.quote),
      artistStatement: normalizeText(input.artistStatement),
      medium: input.medium?.trim(),
      primaryArtForm: normalizeText(input.primaryArtForm),
      secondaryArtForm: normalizeText(input.secondaryArtForm),
      yearsPracticing: normalizeText(input.yearsPracticing),
      profileImageUrl: input.image,
      profileStorageKey: input.imageMeta?.storageKey,
      profileMimeType: input.imageMeta?.mimeType,
      profileSizeBytes: input.imageMeta?.sizeBytes,
      profileWidth: input.imageMeta?.width,
      profileHeight: input.imageMeta?.height,
      coverImageUrl: input.coverImage,
      coverStorageKey: input.coverImageMeta?.storageKey,
      coverMimeType: input.coverImageMeta?.mimeType,
      coverSizeBytes: input.coverImageMeta?.sizeBytes,
      coverWidth: input.coverImageMeta?.width,
      coverHeight: input.coverImageMeta?.height,
      displayOrder: input.displayOrder,
      status: input.status ? parsePersonStatus(input.status) : undefined,
      consentGiven: input.consentGiven,
      importedFrom: normalizeText(input.importedFrom),
      importMetadata: buildImportMetadata(existing.importMetadata, input),
      roles: hasRoleUpdate ? this.buildRoles(nextCategory, nextIsArtist, nextTitle) : undefined,
      featuredWorks: input.featuredWorks ? normalizeFeaturedWorks(input.featuredWorks) : undefined,
      eventParticipations: input.eventParticipations
        ? await this.normalizeEventParticipations(input.eventParticipations)
        : undefined,
    });
    await cleanupReplacedMedia(previousProfileStorageKey, nextProfileStorageKey);
    await cleanupReplacedMedia(previousCoverStorageKey, nextCoverStorageKey);

    return this.getAdminPersonById(id);
  }

  async archiveAdminPerson(id: string) {
    const existing = await this.repository.findPersonById(id);

    if (!existing) {
      throw new NotFoundError("Person not found");
    }

    await this.repository.archivePerson(id);
  }
}
