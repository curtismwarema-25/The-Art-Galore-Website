import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export type GalleryListFilters = {
  eventId?: string;
  eventSlug?: string;
  featured?: boolean;
};

export type AdminGalleryListFilters = {
  eventId?: string;
  featured?: boolean;
  search?: string;
  isActive?: boolean;
};

export type GalleryImageWriteInput = {
  eventId: string;
  caption: string;
  imageUrl: string;
  storageKey: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  altText?: string;
  featured: boolean;
  sortOrder?: number;
  isActive: boolean;
};

export class GalleryRepository {
  async listPublicGalleryImages(filters: GalleryListFilters) {
    const where: Prisma.GalleryImageWhereInput = {
      isActive: true,
      eventId: filters.eventId || undefined,
      featured: filters.featured,
      event: filters.eventSlug
        ? {
            slug: filters.eventSlug,
          }
        : undefined,
    };

    return prisma.galleryImage.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
      },
    });
  }

  async listAdminGalleryImages(filters: AdminGalleryListFilters) {
    return prisma.galleryImage.findMany({
      where: {
        eventId: filters.eventId,
        featured: filters.featured,
        isActive: filters.isActive,
        OR: filters.search
          ? [
              { caption: { contains: filters.search } },
              { event: { title: { contains: filters.search } } },
            ]
          : undefined,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
      },
    });
  }

  async getAdminGalleryImageById(id: string) {
    return prisma.galleryImage.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
      },
    });
  }

  async findGalleryImageById(id: string) {
    return prisma.galleryImage.findUnique({
      where: { id },
      select: { id: true, eventId: true, sortOrder: true, storageKey: true },
    });
  }

  async findEventById(eventId: string) {
    return prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
  }

  async createGalleryImage(data: GalleryImageWriteInput) {
    const image = await prisma.galleryImage.create({
      data: {
        eventId: data.eventId,
        caption: data.caption,
        imageUrl: data.imageUrl,
        storageKey: data.storageKey,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        width: data.width,
        height: data.height,
        altText: data.altText,
        featured: data.featured,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive,
      },
    });

    return image.id;
  }

  async updateGalleryImage(id: string, data: Partial<GalleryImageWriteInput>) {
    await prisma.galleryImage.update({
      where: { id },
      data: {
        eventId: data.eventId,
        caption: data.caption,
        imageUrl: data.imageUrl,
        storageKey: data.storageKey,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        width: data.width,
        height: data.height,
        altText: data.altText,
        featured: data.featured,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });
  }

  async archiveGalleryImage(id: string) {
    await prisma.galleryImage.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}
