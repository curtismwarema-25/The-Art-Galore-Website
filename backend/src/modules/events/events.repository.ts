import type { Prisma } from "@prisma/client";
import { EventStatus, PartnerPlacementContext, TicketTierStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export type EventsListFilters = {
  phase?: "upcoming" | "past" | "all";
  type?: string;
  search?: string;
};

export type AdminEventsListFilters = {
  search?: string;
  status?: EventStatus;
};

export type EventLineupInput = {
  personId?: string;
  name: string;
  role: string;
};

export type EventWriteInput = {
  slug: string;
  title: string;
  eventType: string;
  summary: string;
  description: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  venueName: string;
  capacity?: number;
  status: EventStatus;
  heroImageUrl?: string;
  heroStorageKey?: string;
  heroMimeType?: string;
  heroSizeBytes?: number;
  heroWidth?: number;
  heroHeight?: number;
  displayOrder?: number;
  highlights?: string[];
  lineup?: EventLineupInput[];
  supportedBy?: string[];
};

export type TicketTierWriteInput = {
  slug: string;
  name: string;
  description?: string;
  price: Prisma.Decimal | number;
  currency: string;
  availableQuantity: number;
  maxPerOrder?: number;
  saleStartAt?: Date;
  saleEndAt?: Date;
  status: TicketTierStatus;
  sortOrder?: number;
  perks?: string[];
};

export class EventsRepository {
  async listPublicEvents(filters: EventsListFilters) {
    const now = new Date();

    const where: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
      eventType: filters.type || undefined,
      OR: filters.search
        ? [
            { title: { contains: filters.search } },
            { summary: { contains: filters.search } },
            { venueName: { contains: filters.search } },
            { eventType: { contains: filters.search } },
          ]
        : undefined,
      endAt:
        filters.phase === "upcoming"
          ? { gte: now }
          : filters.phase === "past"
            ? { lt: now }
            : undefined,
    };

    return prisma.event.findMany({
      where,
      orderBy: [{ startAt: "asc" }, { displayOrder: "asc" }],
      include: {
        highlights: {
          orderBy: { sortOrder: "asc" },
        },
        lineupItems: {
          orderBy: { sortOrder: "asc" },
          include: {
            person: {
              select: {
                id: true,
                fullName: true,
                profileImageUrl: true,
              },
            },
          },
        },
        partnerPlacements: {
          where: { isActive: true },
          include: {
            partner: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async getPublicEventBySlug(slug: string) {
    return prisma.event.findFirst({
      where: {
        slug,
        status: EventStatus.PUBLISHED,
      },
      include: {
        highlights: {
          orderBy: { sortOrder: "asc" },
        },
        lineupItems: {
          orderBy: { sortOrder: "asc" },
          include: {
            person: {
              select: {
                id: true,
                fullName: true,
                profileImageUrl: true,
              },
            },
          },
        },
        partnerPlacements: {
          where: { isActive: true },
          include: {
            partner: {
              select: {
                name: true,
              },
            },
          },
        },
        ticketTiers: {
          where: {
            status: {
              in: [TicketTierStatus.ACTIVE, TicketTierStatus.SOLD_OUT],
            },
          },
          orderBy: { sortOrder: "asc" },
          include: {
            perks: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        galleryImages: {
          where: {
            isActive: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        communityUploads: {
          where: {
            status: "APPROVED",
          },
          orderBy: { submittedAt: "desc" },
          take: 12,
        },
      },
    });
  }

  async listAdminEvents(filters: AdminEventsListFilters) {
    return prisma.event.findMany({
      where: {
        status: filters.status,
        OR: filters.search
          ? [
              { title: { contains: filters.search } },
              { slug: { contains: filters.search } },
              { summary: { contains: filters.search } },
              { venueName: { contains: filters.search } },
              { eventType: { contains: filters.search } },
            ]
          : undefined,
      },
      orderBy: [{ startAt: "desc" }, { createdAt: "desc" }],
      include: {
        highlights: {
          orderBy: { sortOrder: "asc" },
        },
        lineupItems: {
          orderBy: { sortOrder: "asc" },
          include: {
            person: {
              select: {
                id: true,
                fullName: true,
                profileImageUrl: true,
              },
            },
          },
        },
        partnerPlacements: {
          where: {
            context: PartnerPlacementContext.EVENT,
            isActive: true,
          },
          include: {
            partner: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async getAdminEventById(id: string) {
    return prisma.event.findUnique({
      where: { id },
      include: {
        highlights: {
          orderBy: { sortOrder: "asc" },
        },
        lineupItems: {
          orderBy: { sortOrder: "asc" },
          include: {
            person: {
              select: {
                id: true,
                fullName: true,
                profileImageUrl: true,
              },
            },
          },
        },
        partnerPlacements: {
          where: {
            context: PartnerPlacementContext.EVENT,
            isActive: true,
          },
          include: {
            partner: {
              select: {
                name: true,
              },
            },
          },
        },
        ticketTiers: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: {
            perks: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        galleryImages: {
          orderBy: { sortOrder: "asc" },
        },
        communityUploads: {
          orderBy: { submittedAt: "desc" },
          take: 12,
        },
      },
    });
  }

  async findEventById(id: string) {
    return prisma.event.findUnique({ where: { id } });
  }

  async findEventBySlug(slug: string, excludeId?: string) {
    return prisma.event.findFirst({
      where: {
        slug,
        id: excludeId
          ? {
              not: excludeId,
            }
          : undefined,
      },
    });
  }

  async createEvent(data: EventWriteInput) {
    return prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          slug: data.slug,
          title: data.title,
          eventType: data.eventType,
          summary: data.summary,
          description: data.description,
          startAt: data.startAt,
          endAt: data.endAt,
          timezone: data.timezone,
          venueName: data.venueName,
          capacity: data.capacity,
          status: data.status,
          heroImageUrl: data.heroImageUrl,
          heroStorageKey: data.heroStorageKey,
          heroMimeType: data.heroMimeType,
          heroSizeBytes: data.heroSizeBytes,
          heroWidth: data.heroWidth,
          heroHeight: data.heroHeight,
          displayOrder: data.displayOrder ?? 0,
        },
      });

      if (data.highlights && data.highlights.length > 0) {
        await tx.eventHighlight.createMany({
          data: data.highlights.map((text, index) => ({
            eventId: event.id,
            text,
            sortOrder: index + 1,
          })),
        });
      }

      if (data.lineup && data.lineup.length > 0) {
        await tx.eventLineupItem.createMany({
          data: data.lineup.map((item, index) => ({
            eventId: event.id,
            personId: item.personId,
            displayName: item.name,
            roleLabel: item.role,
            sortOrder: index + 1,
          })),
        });
      }

      if (data.supportedBy && data.supportedBy.length > 0) {
        const partners = await tx.partner.findMany({
          where: {
            name: {
              in: data.supportedBy,
            },
          },
          select: { id: true },
        });

        if (partners.length > 0) {
          await tx.partnerPlacement.createMany({
            data: partners.map((partner, index) => ({
              partnerId: partner.id,
              context: PartnerPlacementContext.EVENT,
              contextKey: event.slug,
              eventId: event.id,
              displayOrder: index + 1,
              isActive: true,
            })),
            skipDuplicates: true,
          });
        }
      }

      return event.id;
    });
  }

  async updateEvent(id: string, data: Partial<EventWriteInput>) {
    return prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: {
          slug: data.slug,
          title: data.title,
          eventType: data.eventType,
          summary: data.summary,
          description: data.description,
          startAt: data.startAt,
          endAt: data.endAt,
          timezone: data.timezone,
          venueName: data.venueName,
          capacity: data.capacity,
          status: data.status,
          heroImageUrl: data.heroImageUrl,
          heroStorageKey: data.heroStorageKey,
          heroMimeType: data.heroMimeType,
          heroSizeBytes: data.heroSizeBytes,
          heroWidth: data.heroWidth,
          heroHeight: data.heroHeight,
          displayOrder: data.displayOrder,
        },
      });

      if (data.slug) {
        await tx.partnerPlacement.updateMany({
          where: {
            eventId: id,
            context: PartnerPlacementContext.EVENT,
          },
          data: {
            contextKey: data.slug,
          },
        });
      }

      if (data.highlights) {
        await tx.eventHighlight.deleteMany({ where: { eventId: id } });

        if (data.highlights.length > 0) {
          await tx.eventHighlight.createMany({
            data: data.highlights.map((text, index) => ({
              eventId: id,
              text,
              sortOrder: index + 1,
            })),
          });
        }
      }

      if (data.lineup) {
        await tx.eventLineupItem.deleteMany({ where: { eventId: id } });

        if (data.lineup.length > 0) {
          await tx.eventLineupItem.createMany({
            data: data.lineup.map((item, index) => ({
              eventId: id,
              personId: item.personId,
              displayName: item.name,
              roleLabel: item.role,
              sortOrder: index + 1,
            })),
          });
        }
      }

      if (data.supportedBy) {
        const event = await tx.event.findUnique({ where: { id }, select: { slug: true } });

        await tx.partnerPlacement.deleteMany({
          where: {
            eventId: id,
            context: PartnerPlacementContext.EVENT,
          },
        });

        if (event && data.supportedBy.length > 0) {
          const partners = await tx.partner.findMany({
            where: {
              name: {
                in: data.supportedBy,
              },
            },
            select: { id: true },
          });

          if (partners.length > 0) {
            await tx.partnerPlacement.createMany({
              data: partners.map((partner, index) => ({
                partnerId: partner.id,
                context: PartnerPlacementContext.EVENT,
                contextKey: event.slug,
                eventId: id,
                displayOrder: index + 1,
                isActive: true,
              })),
              skipDuplicates: true,
            });
          }
        }
      }

      return id;
    });
  }

  async archiveEvent(id: string) {
    await prisma.event.update({
      where: { id },
      data: {
        status: EventStatus.ARCHIVED,
      },
    });
  }

  async findExistingPersonIds(personIds: string[]) {
    if (personIds.length === 0) return [];

    const people = await prisma.person.findMany({
      where: {
        id: {
          in: personIds,
        },
      },
      select: { id: true },
    });

    return people.map((person) => person.id);
  }

  async listTicketTiersByEventId(eventId: string) {
    return prisma.ticketTier.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        perks: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  }

  async getTicketTierById(id: string) {
    return prisma.ticketTier.findUnique({
      where: { id },
      include: {
        perks: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  }

  async findTicketTierBySlug(slug: string, excludeId?: string) {
    return prisma.ticketTier.findFirst({
      where: {
        slug,
        id: excludeId ? { not: excludeId } : undefined,
      },
    });
  }

  async findTicketTierByName(eventId: string, name: string, excludeId?: string) {
    return prisma.ticketTier.findFirst({
      where: {
        eventId,
        name,
        id: excludeId ? { not: excludeId } : undefined,
      },
    });
  }

  async createTicketTier(eventId: string, data: TicketTierWriteInput) {
    return prisma.$transaction(async (tx) => {
      const tier = await tx.ticketTier.create({
        data: {
          eventId,
          slug: data.slug,
          name: data.name,
          description: data.description,
          price: data.price,
          currency: data.currency,
          availableQuantity: data.availableQuantity,
          maxPerOrder: data.maxPerOrder,
          saleStartAt: data.saleStartAt,
          saleEndAt: data.saleEndAt,
          status: data.status,
          sortOrder: data.sortOrder ?? 0,
        },
      });

      if (data.perks && data.perks.length > 0) {
        await tx.ticketTierPerk.createMany({
          data: data.perks.map((label, index) => ({
            ticketTierId: tier.id,
            label,
            sortOrder: index + 1,
          })),
        });
      }

      return tier.id;
    });
  }

  async updateTicketTier(id: string, data: Partial<TicketTierWriteInput>) {
    return prisma.$transaction(async (tx) => {
      await tx.ticketTier.update({
        where: { id },
        data: {
          slug: data.slug,
          name: data.name,
          description: data.description,
          price: data.price,
          currency: data.currency,
          availableQuantity: data.availableQuantity,
          maxPerOrder: data.maxPerOrder,
          saleStartAt: data.saleStartAt,
          saleEndAt: data.saleEndAt,
          status: data.status,
          sortOrder: data.sortOrder,
        },
      });

      if (data.perks) {
        await tx.ticketTierPerk.deleteMany({ where: { ticketTierId: id } });

        if (data.perks.length > 0) {
          await tx.ticketTierPerk.createMany({
            data: data.perks.map((label, index) => ({
              ticketTierId: id,
              label,
              sortOrder: index + 1,
            })),
          });
        }
      }

      return id;
    });
  }

  async archiveTicketTier(id: string) {
    await prisma.ticketTier.update({
      where: { id },
      data: {
        status: TicketTierStatus.ARCHIVED,
      },
    });
  }
}
