import assert from "node:assert/strict";
import test from "node:test";
import { createCommunityUploadSchema } from "./uploads.schema.js";

const validMedia = {
  storageKey: "community/2026/10/photo.webp",
  mimeType: "image/webp",
  url: "/api/media/files/community/2026/10/photo.webp",
};

test("community submissions require affirmative consent", () => {
  const base = { eventId: "event-1", alias: "Artist", media: validMedia };
  assert.equal(createCommunityUploadSchema.safeParse({ body: { ...base, consentGiven: true } }).success, true);
  assert.equal(createCommunityUploadSchema.safeParse({ body: { ...base, consentGiven: false } }).success, false);
  assert.equal(createCommunityUploadSchema.safeParse({ body: base }).success, false);
});
