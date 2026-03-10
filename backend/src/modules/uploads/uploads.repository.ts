import type { ModerationStatus, Prisma, ReviewDecision } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export type PublicUploadsFilters = {
  eventId?: string;
};

export type AdminUploadsFilters = {
  eventId?: string;
  status?: ModerationStatus;
  search?: string;
};

export type CommunityUploadCreateInput = {
  eventId: string;
  alias: string;
  submitterEmail?: string;
  submitterPhone?: string;
  consentGiven: boolean;
  imageUrl: string;
  storageKey: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
};

export class UploadsRepository {
  async listPublicApprovedUploads(filters: PublicUploadsFilters) {
    const where: Prisma.CommunityUploadWhereInput = {
      eventId: filters.eventId,
      status: "APPROVED",
    };

    return prisma.communityUpload.findMany({
      where,
      orderBy: [{ submittedAt: "desc" }],
      include: {
        reviews: {
          orderBy: { reviewedAt: "desc" },
          take: 1,
          include: {
            reviewer: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });
  }

  async listAdminUploads(filters: AdminUploadsFilters) {
    const where: Prisma.CommunityUploadWhereInput = {
      eventId: filters.eventId,
      status: filters.status,
      OR: filters.search
        ? [
            { alias: { contains: filters.search } },
            { id: { contains: filters.search } },
            { submitterEmail: { contains: filters.search } },
            { event: { title: { contains: filters.search } } },
          ]
        : undefined,
    };

    return prisma.communityUpload.findMany({
      where,
      orderBy: [{ submittedAt: "desc" }],
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
        reviews: {
          orderBy: { reviewedAt: "desc" },
          include: {
            reviewer: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });
  }

  async getAdminUploadById(id: string) {
    return prisma.communityUpload.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
        reviews: {
          orderBy: { reviewedAt: "desc" },
          include: {
            reviewer: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });
  }

  async findUploadById(id: string) {
    return prisma.communityUpload.findUnique({
      where: { id },
      select: { id: true, eventId: true, status: true, storageKey: true },
    });
  }

  async findEventById(eventId: string) {
    return prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
  }

  async createCommunityUpload(data: CommunityUploadCreateInput) {
    const created = await prisma.communityUpload.create({
      data: {
        eventId: data.eventId,
        alias: data.alias,
        submitterEmail: data.submitterEmail,
        submitterPhone: data.submitterPhone,
        consentGiven: data.consentGiven,
        imageUrl: data.imageUrl,
        storageKey: data.storageKey,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        width: data.width,
        height: data.height,
      },
      select: { id: true },
    });

    return created.id;
  }

  async moderateCommunityUpload(id: string, reviewerId: string, decision: ReviewDecision, notes?: string) {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      const nextStatus: ModerationStatus = decision === "APPROVED" ? "APPROVED" : "REJECTED";

      await tx.communityUpload.update({
        where: { id },
        data: {
          status: nextStatus,
          lastReviewedAt: now,
        },
      });

      await tx.communityUploadReview.create({
        data: {
          uploadId: id,
          reviewerId,
          decision,
          notes,
          reviewedAt: now,
        },
      });
    });
  }

  async deleteCommunityUpload(id: string) {
    await prisma.communityUpload.delete({
      where: { id },
    });
  }
}
