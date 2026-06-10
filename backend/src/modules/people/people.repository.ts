import type { Prisma } from "@prisma/client";
import { PersonRoleType, PersonStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { PersonEventParticipationInput as PersonEventParticipationDto } from "./people.types.js";

export type PeopleListFilters = {
  scope?: "all" | "artists" | "team";
  search?: string;
};

export type AdminPeopleListFilters = PeopleListFilters & {
  status?: PersonStatus;
};

export type PersonRoleInput = {
  role: PersonRoleType;
  title?: string;
};

export type PersonWriteInput = {
  slug: string;
  fullName: string;
  preferredName?: string;
  pronunciation?: string;
  email?: string;
  phone?: string;
  city?: string;
  preferredContactMethod?: string;
  headline?: string;
  shortBio?: string;
  bio: string;
  quote?: string;
  artistStatement?: string;
  medium?: string;
  primaryArtForm?: string;
  secondaryArtForm?: string;
  yearsPracticing?: string;
  profileImageUrl?: string;
  profileStorageKey?: string;
  profileMimeType?: string;
  profileSizeBytes?: number;
  profileWidth?: number;
  profileHeight?: number;
  coverImageUrl?: string;
  coverStorageKey?: string;
  coverMimeType?: string;
  coverSizeBytes?: number;
  coverWidth?: number;
  coverHeight?: number;
  displayOrder?: number;
  status: PersonStatus;
  consentGiven?: boolean;
  importedFrom?: string;
  importMetadata?: Prisma.InputJsonValue;
  roles: PersonRoleInput[];
  featuredWorks?: string[];
  eventParticipations?: PersonEventParticipationDto[];
};

export class PeopleRepository {
  async listPublicPeople(filters: PeopleListFilters) {
    const where: Prisma.PersonWhereInput = {
      status: PersonStatus.ACTIVE,
      OR: filters.search
        ? [
            { fullName: { contains: filters.search } },
            { headline: { contains: filters.search } },
            { bio: { contains: filters.search } },
            { medium: { contains: filters.search } },
          ]
        : undefined,
      roles:
        filters.scope === "artists"
          ? { some: { role: PersonRoleType.ARTIST } }
          : filters.scope === "team"
            ? { some: { role: { in: [PersonRoleType.LEADERSHIP, PersonRoleType.MEMBER] } } }
            : undefined,
    };

    return prisma.person.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      include: {
        roles: {
          orderBy: { createdAt: "asc" },
        },
        featuredWorks: {
          orderBy: { sortOrder: "asc" },
        },
        participations: {
          include: {
            event: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });
  }

  async getPublicPersonBySlug(slug: string) {
    return prisma.person.findFirst({
      where: {
        slug,
        status: PersonStatus.ACTIVE,
      },
      include: {
        roles: {
          orderBy: { createdAt: "asc" },
        },
        featuredWorks: {
          orderBy: { sortOrder: "asc" },
        },
        participations: {
          include: {
            event: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });
  }

  async listAdminPeople(filters: AdminPeopleListFilters) {
    const where: Prisma.PersonWhereInput = {
      status: filters.status,
      OR: filters.search
        ? [
            { fullName: { contains: filters.search } },
            { slug: { contains: filters.search } },
            { headline: { contains: filters.search } },
            { bio: { contains: filters.search } },
            { medium: { contains: filters.search } },
          ]
        : undefined,
      roles:
        filters.scope === "artists"
          ? { some: { role: PersonRoleType.ARTIST } }
          : filters.scope === "team"
            ? { some: { role: { in: [PersonRoleType.LEADERSHIP, PersonRoleType.MEMBER] } } }
            : undefined,
    };

    return prisma.person.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      include: {
        roles: {
          orderBy: { createdAt: "asc" },
        },
        featuredWorks: {
          orderBy: { sortOrder: "asc" },
        },
        participations: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });
  }

  async getAdminPersonById(id: string) {
    return prisma.person.findUnique({
      where: { id },
      include: {
        roles: {
          orderBy: { createdAt: "asc" },
        },
        featuredWorks: {
          orderBy: { sortOrder: "asc" },
        },
        participations: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });
  }

  async findPersonById(id: string) {
    return prisma.person.findUnique({
      where: { id },
      include: {
        roles: true,
      },
    });
  }

  async findPersonBySlug(slug: string, excludeId?: string) {
    return prisma.person.findFirst({
      where: {
        slug,
        id: excludeId
          ? {
              not: excludeId,
            }
          : undefined,
      },
      select: { id: true },
    });
  }

  async findExistingEventIds(eventIds: string[]) {
    if (eventIds.length === 0) return [];

    const events = await prisma.event.findMany({
      where: {
        id: {
          in: eventIds,
        },
      },
      select: { id: true },
    });

    return events.map((event) => event.id);
  }

  async createPerson(data: PersonWriteInput) {
    return prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          slug: data.slug,
          fullName: data.fullName,
          preferredName: data.preferredName,
          pronunciation: data.pronunciation,
          email: data.email,
          phone: data.phone,
          city: data.city,
          preferredContactMethod: data.preferredContactMethod,
          headline: data.headline,
          shortBio: data.shortBio,
          bio: data.bio,
          quote: data.quote,
          artistStatement: data.artistStatement,
          medium: data.medium,
          primaryArtForm: data.primaryArtForm,
          secondaryArtForm: data.secondaryArtForm,
          yearsPracticing: data.yearsPracticing,
          profileImageUrl: data.profileImageUrl,
          profileStorageKey: data.profileStorageKey,
          profileMimeType: data.profileMimeType,
          profileSizeBytes: data.profileSizeBytes,
          profileWidth: data.profileWidth,
          profileHeight: data.profileHeight,
          coverImageUrl: data.coverImageUrl,
          coverStorageKey: data.coverStorageKey,
          coverMimeType: data.coverMimeType,
          coverSizeBytes: data.coverSizeBytes,
          coverWidth: data.coverWidth,
          coverHeight: data.coverHeight,
          displayOrder: data.displayOrder ?? 0,
          status: data.status,
          consentGiven: data.consentGiven,
          importedFrom: data.importedFrom,
          importMetadata: data.importMetadata,
        },
      });

      if (data.roles.length > 0) {
        await tx.personRole.createMany({
          data: data.roles.map((role) => ({
            personId: person.id,
            role: role.role,
            title: role.title,
          })),
        });
      }

      if (data.featuredWorks && data.featuredWorks.length > 0) {
        await tx.personFeaturedWork.createMany({
          data: data.featuredWorks.map((title, index) => ({
            personId: person.id,
            title,
            sortOrder: index + 1,
          })),
        });
      }

      if (data.eventParticipations && data.eventParticipations.length > 0) {
        await tx.eventParticipation.createMany({
          data: data.eventParticipations.map((participation) => ({
            personId: person.id,
            eventId: participation.eventId,
            participationRole: participation.participationRole,
          })),
          skipDuplicates: true,
        });
      }

      return person.id;
    });
  }

  async updatePerson(id: string, data: Partial<PersonWriteInput>) {
    return prisma.$transaction(async (tx) => {
      await tx.person.update({
        where: { id },
        data: {
          slug: data.slug,
          fullName: data.fullName,
          preferredName: data.preferredName,
          pronunciation: data.pronunciation,
          email: data.email,
          phone: data.phone,
          city: data.city,
          preferredContactMethod: data.preferredContactMethod,
          headline: data.headline,
          shortBio: data.shortBio,
          bio: data.bio,
          quote: data.quote,
          artistStatement: data.artistStatement,
          medium: data.medium,
          primaryArtForm: data.primaryArtForm,
          secondaryArtForm: data.secondaryArtForm,
          yearsPracticing: data.yearsPracticing,
          profileImageUrl: data.profileImageUrl,
          profileStorageKey: data.profileStorageKey,
          profileMimeType: data.profileMimeType,
          profileSizeBytes: data.profileSizeBytes,
          profileWidth: data.profileWidth,
          profileHeight: data.profileHeight,
          coverImageUrl: data.coverImageUrl,
          coverStorageKey: data.coverStorageKey,
          coverMimeType: data.coverMimeType,
          coverSizeBytes: data.coverSizeBytes,
          coverWidth: data.coverWidth,
          coverHeight: data.coverHeight,
          displayOrder: data.displayOrder,
          status: data.status,
          consentGiven: data.consentGiven,
          importedFrom: data.importedFrom,
          importMetadata: data.importMetadata,
        },
      });

      if (data.roles) {
        await tx.personRole.deleteMany({ where: { personId: id } });

        if (data.roles.length > 0) {
          await tx.personRole.createMany({
            data: data.roles.map((role) => ({
              personId: id,
              role: role.role,
              title: role.title,
            })),
          });
        }
      }

      if (data.featuredWorks) {
        await tx.personFeaturedWork.deleteMany({ where: { personId: id } });

        if (data.featuredWorks.length > 0) {
          await tx.personFeaturedWork.createMany({
            data: data.featuredWorks.map((title, index) => ({
              personId: id,
              title,
              sortOrder: index + 1,
            })),
          });
        }
      }

      if (data.eventParticipations) {
        await tx.eventParticipation.deleteMany({ where: { personId: id } });

        if (data.eventParticipations.length > 0) {
          await tx.eventParticipation.createMany({
            data: data.eventParticipations.map((participation) => ({
              personId: id,
              eventId: participation.eventId,
              participationRole: participation.participationRole,
            })),
            skipDuplicates: true,
          });
        }
      }

      return id;
    });
  }

  async archivePerson(id: string) {
    await prisma.person.update({
      where: { id },
      data: {
        status: PersonStatus.ARCHIVED,
      },
    });
  }
}
