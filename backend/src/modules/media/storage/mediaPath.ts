import { isAbsolute, relative, resolve, sep } from "node:path";

export function resolveMediaAbsolutePath(root: string, storageKey: string) {
  const normalized = storageKey.replace(/\\/g, "/");
  if (!normalized || normalized.includes("\0") || isAbsolute(normalized) || normalized.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Invalid storage key");
  }
  const absolute = resolve(root, normalized);
  const fromRoot = relative(resolve(root), absolute);
  if (!fromRoot || fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error("Invalid storage key");
  }
  return { absolute, normalized };
}
