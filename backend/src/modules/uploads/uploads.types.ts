export type UploadMediaMetadata = {
  storageKey: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  url: string;
};

export type UploadModerationStatus = "pending" | "approved" | "rejected";
export type UploadReviewDecision = "approved" | "rejected";

export type UploadReviewRecord = {
  id: string;
  decision: UploadReviewDecision;
  notes?: string;
  reviewedAt: string;
  reviewerId: string;
  reviewerName: string;
};

export type PublicCommunityUploadRecord = {
  id: string;
  slug: string;
  eventId: string;
  alias: string;
  image: string;
  media: UploadMediaMetadata;
  status: UploadModerationStatus;
  moderationNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminCommunityUploadRecord = PublicCommunityUploadRecord & {
  submitterEmail?: string;
  submitterPhone?: string;
  consentGiven: boolean;
  reviewHistory: UploadReviewRecord[];
};

export type SerializedCommunityUploadRecord = PublicCommunityUploadRecord;
export type SerializedAdminCommunityUploadRecord = AdminCommunityUploadRecord;

export type CreateCommunityUploadInput = {
  eventId: string;
  alias: string;
  submitterEmail?: string;
  submitterPhone?: string;
  consentGiven?: boolean;
  media: UploadMediaMetadata;
};

export type ModerateCommunityUploadInput = {
  decision: UploadReviewDecision;
  notes?: string;
};
