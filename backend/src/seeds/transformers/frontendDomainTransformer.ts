import type { SeedBundle } from "../types.js";

// Future adapter to map frontend domain/mock exports into backend seed bundle format.
// Keep this isolated so seed ingestion does not tightly couple backend runtime to frontend code.
export function transformFrontendDomainToSeedBundle(_input: unknown): SeedBundle {
  throw new Error("transformFrontendDomainToSeedBundle is not implemented yet.");
}
