import { PartnerPlacementContext, PartnerStatus, type Partner, type PartnerPlacement } from "@prisma/client";
import { NotFoundError, ValidationError } from "../../common/errors/httpErrors.js";
import { slugify } from "../../common/utils/slug.js";
import {
  PartnersRepository,
  type AdminPartnersListFilters,
  type PartnerWriteInput,
  type PartnersListFilters,
} from "./partners.repository.js";
import { cleanupReplacedMedia } from "../media/mediaLifecycle.js";
import type {
  AdminCreatePartnerInput,
  AdminUpdatePartnerInput,
  PublicPartnerRecord,
  SerializedPartnerRecord,
} from "./partners.types.js";

type PartnerWithPlacements = Partner & {
  placements: Pick<PartnerPlacement, "context" | "isActive">[];
};

function mapPartnerStatus(status: PartnerStatus): PublicPartnerRecord["status"] {
  if (status === PartnerStatus.DRAFT) return "draft";
  if (status === PartnerStatus.ACTIVE) return "published";
  return "archived";
}

function parsePartnerStatus(status?: "draft" | "published" | "archived"): PartnerStatus {
  if (status === "draft") return PartnerStatus.DRAFT;
  if (status === "archived") return PartnerStatus.ARCHIVED;
  return PartnerStatus.ACTIVE;
}

function toLogoText(name: string, logoText?: string | null) {
  if (logoText && logoText.trim()) return logoText;

  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

function mapPartnerRecord(partner: PartnerWithPlacements): PublicPartnerRecord {
  const showOnHomepage = partner.placements.some((placement) => placement.context === PartnerPlacementContext.HOMEPAGE && placement.isActive);

  return {
    id: partner.id,
    slug: partner.slug,
    status: mapPartnerStatus(partner.status),
    name: partner.name,
    logoText: toLogoText(partner.name, partner.logoText),
    logoMeta: partner.logoStorageKey
      ? {
          storageKey: partner.logoStorageKey,
          mimeType: partner.logoMimeType ?? undefined,
          sizeBytes: partner.logoSizeBytes ?? undefined,
          url: partner.logoUrl ?? undefined,
        }
      : undefined,
    description: partner.description,
    partnershipType: partner.partnershipType ?? "Collaborator",
    website: partner.website ?? undefined,
    showOnHomepage,
    visibility: showOnHomepage ? "homepage" : "directory-only",
    displayOrder: partner.displayOrder,
    createdAt: partner.createdAt.toISOString(),
    updatedAt: partner.updatedAt.toISOString(),
  };
}

export class PartnersService {
  constructor(private readonly repository: PartnersRepository = new PartnersRepository()) {}

  async listPublicPartners(filters: PartnersListFilters) {
    const records = await this.repository.listPublicPartners(filters);
    return records.map((record) => mapPartnerRecord(record as PartnerWithPlacements));
  }

  async listAdminPartners(filters: AdminPartnersListFilters) {
    const records = await this.repository.listAdminPartners(filters);
    return records.map((record) => mapPartnerRecord(record as PartnerWithPlacements));
  }

  async getAdminPartnerById(id: string) {
    const record = await this.repository.getAdminPartnerById(id);

    if (!record) {
      throw new NotFoundError("Partner not found");
    }

    return mapPartnerRecord(record as PartnerWithPlacements);
  }

  private async getUniquePartnerSlug(name: string, inputSlug?: string, excludeId?: string) {
    const baseSlug = slugify(inputSlug?.trim() || name);
    if (!baseSlug) {
      throw new ValidationError("Unable to generate partner slug");
    }

    let candidate = baseSlug;
    let counter = 2;

    while (await this.repository.findPartnerBySlug(candidate, excludeId)) {
      candidate = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return candidate;
  }

  async createAdminPartner(input: AdminCreatePartnerInput) {
    const slug = await this.getUniquePartnerSlug(input.name, input.slug);

    const createdId = await this.repository.createPartner({
      slug,
      name: input.name.trim(),
      status: parsePartnerStatus(input.status),
      description: input.description.trim(),
      partnershipType: input.partnershipType?.trim() || "Collaborator",
      website: input.website,
      logoText: input.logoText?.trim(),
      logoUrl: input.logoMeta?.url,
      logoStorageKey: input.logoMeta?.storageKey,
      logoMimeType: input.logoMeta?.mimeType,
      logoSizeBytes: input.logoMeta?.sizeBytes,
      displayOrder: input.displayOrder,
      showOnHomepage: input.showOnHomepage ?? false,
    } satisfies PartnerWriteInput);

    return this.getAdminPartnerById(createdId);
  }

  async updateAdminPartner(id: string, input: AdminUpdatePartnerInput) {
    const existing = await this.repository.findPartnerById(id);

    if (!existing) {
      throw new NotFoundError("Partner not found");
    }

    const previousLogoStorageKey = existing.logoStorageKey;
    const nextLogoStorageKey = input.logoMeta?.storageKey ?? previousLogoStorageKey;

    await this.repository.updatePartner(id, {
      slug: input.slug || input.name ? await this.getUniquePartnerSlug(input.name ?? existing.name, input.slug, id) : undefined,
      name: input.name?.trim(),
      status: input.status ? parsePartnerStatus(input.status) : undefined,
      description: input.description?.trim(),
      partnershipType: input.partnershipType?.trim(),
      website: input.website,
      logoText: input.logoText?.trim(),
      logoUrl: input.logoMeta?.url,
      logoStorageKey: input.logoMeta?.storageKey,
      logoMimeType: input.logoMeta?.mimeType,
      logoSizeBytes: input.logoMeta?.sizeBytes,
      displayOrder: input.displayOrder,
      showOnHomepage: input.showOnHomepage,
    });
    await cleanupReplacedMedia(previousLogoStorageKey, nextLogoStorageKey);

    return this.getAdminPartnerById(id);
  }

  async archiveAdminPartner(id: string) {
    const existing = await this.repository.findPartnerById(id);

    if (!existing) {
      throw new NotFoundError("Partner not found");
    }

    await this.repository.archivePartner(id);
  }
}
