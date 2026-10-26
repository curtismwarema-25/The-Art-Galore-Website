import type { CommunityUpload, CommunityUploadReview, ModerationStatus } from "@prisma/client";
import { NotFoundError, ValidationError } from "../../common/errors/httpErrors.js";
import {
  UploadsRepository,
  type AdminUploadsFilters,
  type CommunityUploadCreateInput,
  type PublicUploadsFilters,
} from "./uploads.repository.js";
import type {
  AdminCommunityUploadRecord,
  CreateCommunityUploadInput,
  ModerateCommunityUploadInput,
  SerializedAdminCommunityUploadRecord,
  SerializedCommunityUploadRecord,
  UploadModerationStatus,
  UploadReviewRecord,
} from "./uploads.types.js";
import { cleanupDeletedMedia } from "../media/mediaLifecycle.js";

type UploadWithReviews = CommunityUpload & {
  reviews: Array<
    CommunityUploadReview & {
      reviewer: {
        id: string;
        fullName: string;
      };
    }
  >;
};

function mapModerationStatus(status: ModerationStatus): UploadModerationStatus {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  return "pending";
}

function mapReviewHistory(
  reviews: UploadWithReviews["reviews"],
): UploadReviewRecord[] {
  return reviews.map((review) => ({
    id: review.id,
    decision: review.decision === "APPROVED" ? "approved" : "rejected",
    notes: review.notes ?? undefined,
    reviewedAt: review.reviewedAt.toISOString(),
    reviewerId: review.reviewer.id,
    reviewerName: review.reviewer.fullName,
  }));
}

function mapCommunityUpload(
  upload: UploadWithReviews,
): SerializedCommunityUploadRecord {
  const latestReview = upload.reviews[0];

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
    status: mapModerationStatus(upload.status),
    moderationNotes: latestReview?.notes ?? undefined,
    reviewedBy: latestReview?.reviewer.fullName,
    reviewedAt: upload.lastReviewedAt?.toISOString(),
    submittedAt: upload.submittedAt.toISOString(),
    displayOrder: 0,
    createdAt: upload.createdAt.toISOString(),
    updatedAt: upload.updatedAt.toISOString(),
  };
}

function mapAdminCommunityUpload(upload: UploadWithReviews): SerializedAdminCommunityUploadRecord {
  const mapped = mapCommunityUpload(upload);

  return {
    ...mapped,
    submitterEmail: upload.submitterEmail ?? undefined,
    submitterPhone: upload.submitterPhone ?? undefined,
    consentGiven: upload.consentGiven,
    image: `/api/admin/community-uploads/${upload.id}/media`,
    media: { ...mapped.media, url: `/api/admin/community-uploads/${upload.id}/media` },
    reviewHistory: mapReviewHistory(upload.reviews),
  } satisfies AdminCommunityUploadRecord;
}

export class UploadsService {
  constructor(private readonly repository: UploadsRepository = new UploadsRepository()) {}

  private async assertEventExists(eventId: string) {
    const event = await this.repository.findEventById(eventId);
    if (!event) {
      throw new ValidationError("Event reference is invalid");
    }
  }

  async listPublicApprovedUploads(filters: PublicUploadsFilters) {
    const uploads = await this.repository.listPublicApprovedUploads(filters);
    return uploads.map((upload) => mapCommunityUpload(upload as UploadWithReviews));
  }

  async submitCommunityUpload(input: CreateCommunityUploadInput) {
    await this.assertEventExists(input.eventId);

    const createdId = await this.repository.createCommunityUpload({
      eventId: input.eventId,
      alias: input.alias.trim(),
      submitterEmail: input.submitterEmail?.trim(),
      submitterPhone: input.submitterPhone?.trim(),
      consentGiven: input.consentGiven ?? false,
      imageUrl: input.media.url,
      storageKey: input.media.storageKey,
      mimeType: input.media.mimeType,
      sizeBytes: input.media.sizeBytes,
      width: input.media.width,
      height: input.media.height,
    } satisfies CommunityUploadCreateInput);

    const created = await this.repository.getAdminUploadById(createdId);
    if (!created) {
      throw new NotFoundError("Upload not found");
    }

    return mapAdminCommunityUpload(created as UploadWithReviews);
  }

  async listAdminUploads(filters: AdminUploadsFilters) {
    const uploads = await this.repository.listAdminUploads(filters);
    return uploads.map((upload) => mapAdminCommunityUpload(upload as UploadWithReviews));
  }

  async getAdminUploadById(id: string) {
    const upload = await this.repository.getAdminUploadById(id);

    if (!upload) {
      throw new NotFoundError("Community upload not found");
    }

    return mapAdminCommunityUpload(upload as UploadWithReviews);
  }

  async getAdminUploadMediaPath(id: string) {
    const upload = await this.repository.findUploadById(id);
    if (!upload) throw new NotFoundError("Community upload not found");
    const { mediaStorage } = await import("../media/storage/provider.js");
    return mediaStorage.getExistingFilePath(upload.storageKey);
  }

  async moderateUpload(id: string, reviewerId: string, input: ModerateCommunityUploadInput) {
    const existing = await this.repository.findUploadById(id);
    if (!existing) {
      throw new NotFoundError("Community upload not found");
    }

    await this.repository.moderateCommunityUpload(
      id,
      reviewerId,
      input.decision === "approved" ? "APPROVED" : "REJECTED",
      input.notes?.trim(),
    );

    return this.getAdminUploadById(id);
  }

  async deleteUpload(id: string) {
    const existing = await this.repository.findUploadById(id);
    if (!existing) {
      throw new NotFoundError("Community upload not found");
    }

    await this.repository.deleteCommunityUpload(id);
    await cleanupDeletedMedia(existing.storageKey);
  }
}
