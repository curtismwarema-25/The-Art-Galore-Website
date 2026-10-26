import assert from "node:assert/strict";
import test from "node:test";
import { canReviewPrivateMedia, isCommunityMediaApproved, isPublicMediaTarget } from "./mediaAccess.js";

test("payment proofs and unreviewed community media are never public targets", () => {
  assert.equal(isPublicMediaTarget("payment-proof"), false);
  assert.equal(isPublicMediaTarget("community"), false);
  assert.equal(isCommunityMediaApproved("PENDING"), false);
  assert.equal(isCommunityMediaApproved("REJECTED"), false);
});

test("private media is limited to authenticated review roles", () => {
  assert.equal(canReviewPrivateMedia(undefined), false);
  assert.equal(canReviewPrivateMedia("BUYER"), false);
  for (const role of ["ADMIN", "STAFF", "MODERATOR"]) assert.equal(canReviewPrivateMedia(role), true);
});

test("approved community images and established public media remain eligible", () => {
  assert.equal(isCommunityMediaApproved("APPROVED"), true);
  for (const target of ["gallery", "partner-logo", "person-profile", "person-cover", "event-hero"]) {
    assert.equal(isPublicMediaTarget(target), true);
  }
});
