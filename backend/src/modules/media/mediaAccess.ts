const PUBLIC_MEDIA_TARGETS = new Set(["gallery", "partner-logo", "person-profile", "person-cover", "event-hero"]);
const PRIVATE_MEDIA_REVIEW_ROLES = new Set(["ADMIN", "STAFF", "MODERATOR"]);

export function isPublicMediaTarget(target: string) {
  return PUBLIC_MEDIA_TARGETS.has(target);
}

export function isCommunityMediaApproved(status: string | undefined) {
  return status === "APPROVED";
}

export function canReviewPrivateMedia(role: string | undefined) {
  return role !== undefined && PRIVATE_MEDIA_REVIEW_ROLES.has(role);
}
