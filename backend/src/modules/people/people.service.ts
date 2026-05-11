import { PersonRoleType, PersonStatus, type Person, type PersonFeaturedWork, type PersonRole } from "@prisma/client";
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

function mapPersonRecord(person: PersonWithPublicRelations): PublicPersonRecord {
  const hasLeadershipRole = person.roles.some((role) => role.role === PersonRoleType.LEADERSHIP);
  const isArtist = person.roles.some((role) => role.role === PersonRoleType.ARTIST);

  return {
    id: person.id,
    slug: person.slug,
    displayOrder: person.displayOrder,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
    status: mapPersonStatus(person.status),
    name: person.fullName,
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
    bio: person.bio,
    socials: {},
    medium: person.medium ?? "Mixed Media",
    featuredWorks: person.featuredWorks.map((work) => work.title),
    eventsParticipated: person.participations.map((participation) => participation.event.title),
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
    return people.map((person) => mapPersonRecord(person as PersonWithPublicRelations));
  }

  async getPublicPersonBySlug(slug: string) {
    const person = await this.repository.getPublicPersonBySlug(slug);

    if (!person) {
      throw new NotFoundError("Person not found");
    }

    return mapPersonRecord(person as PersonWithPublicRelations);
  }

  async listAdminPeople(filters: AdminPeopleListFilters) {
    const people = await this.repository.listAdminPeople(filters);
    return people.map((person) => mapPersonRecord(person as PersonWithPublicRelations));
  }

  async getAdminPersonById(id: string) {
    const person = await this.repository.getAdminPersonById(id);

    if (!person) {
      throw new NotFoundError("Person not found");
    }

    return mapPersonRecord(person as PersonWithPublicRelations);
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
      headline: input.role.trim(),
      bio: input.bio.trim(),
      medium: input.medium?.trim() || undefined,
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
      headline: input.role?.trim(),
      bio: input.bio?.trim(),
      medium: input.medium?.trim(),
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
