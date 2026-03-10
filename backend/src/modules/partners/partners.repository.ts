import type { Prisma } from "@prisma/client";
import { PartnerPlacementContext, PartnerStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export type PartnersListFilters = {
  homepageOnly?: boolean;
  context?: "HOMEPAGE" | "DIRECTORY" | "EVENT";
  eventSlug?: string;
  search?: string;
};

export type AdminPartnersListFilters = {
  search?: string;
  homepageOnly?: boolean;
  status?: PartnerStatus;
};

export type PartnerWriteInput = {
  slug: string;
  name: string;
  status: PartnerStatus;
  description: string;
  partnershipType?: string;
  website?: string;
  logoText?: string;
  logoUrl?: string;
  logoStorageKey?: string;
  logoMimeType?: string;
  logoSizeBytes?: number;
  displayOrder?: number;
  showOnHomepage: boolean;
};

const HOMEPAGE_CONTEXT_KEY = "homepage-main";

export class PartnersRepository {
  async listPublicPartners(filters: PartnersListFilters) {
    const where: Prisma.PartnerWhereInput = {
      status: PartnerStatus.ACTIVE,
      OR: filters.search
        ? [
            { name: { contains: filters.search } },
            { description: { contains: filters.search } },
            { partnershipType: { contains: filters.search } },
          ]
        : undefined,
      placements:
        filters.context || filters.homepageOnly || filters.eventSlug
          ? {
              some: {
                isActive: true,
                context: filters.context ? (filters.context as PartnerPlacementContext) : undefined,
                ...(filters.homepageOnly
                  ? {
                      context: PartnerPlacementContext.HOMEPAGE,
                    }
                  : {}),
                ...(filters.eventSlug
                  ? {
                      event: {
                        slug: filters.eventSlug,
                      },
                    }
                  : {}),
              },
            }
          : undefined,
    };

    return prisma.partner.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: {
        placements: {
          where: { isActive: true },
          select: {
            context: true,
            contextKey: true,
            eventId: true,
            displayOrder: true,
            isActive: true,
          },
        },
      },
    });
  }

  async listAdminPartners(filters: AdminPartnersListFilters) {
    return prisma.partner.findMany({
      where: {
        status: filters.status,
        OR: filters.search
          ? [
              { name: { contains: filters.search } },
              { slug: { contains: filters.search } },
              { description: { contains: filters.search } },
              { partnershipType: { contains: filters.search } },
            ]
          : undefined,
        placements: filters.homepageOnly
          ? {
              some: {
                context: PartnerPlacementContext.HOMEPAGE,
                contextKey: HOMEPAGE_CONTEXT_KEY,
                isActive: true,
              },
            }
          : undefined,
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: {
        placements: {
          where: { isActive: true },
          select: {
            context: true,
            contextKey: true,
            eventId: true,
            displayOrder: true,
            isActive: true,
          },
        },
      },
    });
  }

  async getAdminPartnerById(id: string) {
    return prisma.partner.findUnique({
      where: { id },
      include: {
        placements: {
          where: { isActive: true },
          select: {
            context: true,
            contextKey: true,
            eventId: true,
            displayOrder: true,
            isActive: true,
          },
        },
      },
    });
  }

  async findPartnerById(id: string) {
    return prisma.partner.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, logoStorageKey: true },
    });
  }

  async findPartnerBySlug(slug: string, excludeId?: string) {
    return prisma.partner.findFirst({
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

  async createPartner(data: PartnerWriteInput) {
    return prisma.$transaction(async (tx) => {
      const partner = await tx.partner.create({
        data: {
          slug: data.slug,
          name: data.name,
          status: data.status,
          description: data.description,
          partnershipType: data.partnershipType,
          website: data.website,
          logoText: data.logoText,
          logoUrl: data.logoUrl,
          logoStorageKey: data.logoStorageKey,
          logoMimeType: data.logoMimeType,
          logoSizeBytes: data.logoSizeBytes,
          displayOrder: data.displayOrder ?? 0,
        },
      });

      if (data.showOnHomepage) {
        await tx.partnerPlacement.create({
          data: {
            partnerId: partner.id,
            context: PartnerPlacementContext.HOMEPAGE,
            contextKey: HOMEPAGE_CONTEXT_KEY,
            displayOrder: data.displayOrder ?? 0,
            isActive: true,
          },
        });
      }

      return partner.id;
    });
  }

  async updatePartner(id: string, data: Partial<PartnerWriteInput>) {
    return prisma.$transaction(async (tx) => {
      await tx.partner.update({
        where: { id },
        data: {
          slug: data.slug,
          name: data.name,
          status: data.status,
          description: data.description,
          partnershipType: data.partnershipType,
          website: data.website,
          logoText: data.logoText,
          logoUrl: data.logoUrl,
          logoStorageKey: data.logoStorageKey,
          logoMimeType: data.logoMimeType,
          logoSizeBytes: data.logoSizeBytes,
          displayOrder: data.displayOrder,
        },
      });

      if (data.showOnHomepage !== undefined) {
        if (data.showOnHomepage) {
          await tx.partnerPlacement.upsert({
            where: {
              partnerId_context_contextKey: {
                partnerId: id,
                context: PartnerPlacementContext.HOMEPAGE,
                contextKey: HOMEPAGE_CONTEXT_KEY,
              },
            },
            create: {
              partnerId: id,
              context: PartnerPlacementContext.HOMEPAGE,
              contextKey: HOMEPAGE_CONTEXT_KEY,
              displayOrder: data.displayOrder ?? 0,
              isActive: true,
            },
            update: {
              isActive: true,
              displayOrder: data.displayOrder,
            },
          });
        } else {
          await tx.partnerPlacement.updateMany({
            where: {
              partnerId: id,
              context: PartnerPlacementContext.HOMEPAGE,
              contextKey: HOMEPAGE_CONTEXT_KEY,
            },
            data: {
              isActive: false,
            },
          });
        }
      } else if (data.displayOrder !== undefined) {
        await tx.partnerPlacement.updateMany({
          where: {
            partnerId: id,
            context: PartnerPlacementContext.HOMEPAGE,
            contextKey: HOMEPAGE_CONTEXT_KEY,
            isActive: true,
          },
          data: {
            displayOrder: data.displayOrder,
          },
        });
      }

      return id;
    });
  }

  async archivePartner(id: string) {
    await prisma.$transaction(async (tx) => {
      await tx.partner.update({
        where: { id },
        data: {
          status: PartnerStatus.ARCHIVED,
        },
      });

      await tx.partnerPlacement.updateMany({
        where: {
          partnerId: id,
        },
        data: {
          isActive: false,
        },
      });
    });
  }
}
