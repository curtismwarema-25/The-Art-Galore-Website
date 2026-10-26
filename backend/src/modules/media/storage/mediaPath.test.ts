import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { resolveMediaAbsolutePath } from "./mediaPath.js";

test("resolves ordinary storage keys under the configured root", () => {
  const root = resolve("/srv/artgalore/media");
  assert.deepEqual(resolveMediaAbsolutePath(root, "community/2026/10/image.webp"), {
    absolute: resolve(root, "community/2026/10/image.webp"),
    normalized: "community/2026/10/image.webp",
  });
});

test("rejects traversal, absolute paths, empty segments, and NUL bytes", () => {
  const root = resolve("/srv/artgalore/media");
  for (const key of ["../secret", "community/../../secret", "/etc/passwd", "community//image.jpg", "community/./image.jpg", "community/\0image.jpg"]) {
    assert.throws(() => resolveMediaAbsolutePath(root, key), /Invalid storage key/);
  }
});

test("rejects sibling traversal despite a matching path prefix", () => {
  const root = resolve("/srv/artgalore/media");
  assert.throws(() => resolveMediaAbsolutePath(root, "../media-private/proof.jpg"), /Invalid storage key/);
});
