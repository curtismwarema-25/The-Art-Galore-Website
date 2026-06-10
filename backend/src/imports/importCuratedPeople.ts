import "dotenv/config";
import {
  PersonRoleType,
  PersonStatus,
  PrismaClient,
  type Person,
  type PersonRole,
  type Prisma,
} from "@prisma/client";
import { slugify } from "../common/utils/slug.js";
import { curatedPeoplePayload, type CuratedPersonInput } from "./curatedPeoplePayload.js";
import { loadSpreadsheetCuratedPeople } from "./curatedPeopleSpreadsheet.js";

const IMPORT_SOURCE = "google_form_curated_import";
const METADATA_ONLY_FIELDS = [
  "socials",
  "eventsParticipatedRaw",
  "eventRolesRaw",
  "interestedInCollaborating",
  "additionalWorkUrl",
  "importNotes",
] as const;

type MatchBy = "email" | "fullName" | "slug";

type PersonWithRoles = Person & {
  roles: PersonRole[];
};

type NormalizedPerson = {
  fullName: string;
  preferredName: string | null;
  slug: string;
  pronunciation: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  preferredContactMethod: string | null;
  organizationRole: string;
  category: "leadership" | "member";
  isArtist: boolean;
  primaryArtForm: string | null;
  secondaryArtForm: string | null;
  yearsPracticing: string | null;
  artistStatement: string | null;
  shortBio: string | null;
  longBio: string;
  quote: string | null;
  medium: string | null;
  socials: Record<string, string>;
  eventsParticipatedRaw: string[];
  eventRolesRaw: string[];
  interestedInCollaborating: boolean;
  profilePhotoUrl: string | null;
  portfolioImagesUrl: string | null;
  additionalWorkUrl: string | null;
  consentGiven: boolean;
  displayOrder: number;
  importNotes: string | null;
  metadataOnlyFieldsUsed: string[];
};

type UpsertResult = {
  action: "created" | "updated" | "unchanged";
  fullName: string;
  personId: string;
  matchedBy?: MatchBy;
  changedFields: string[];
  metadataFieldsStored: string[];
  manualReviewNotes: string[];
};

type ImportCliOptions = {
  dryRun: boolean;
  filePath?: string;
};

const prisma = new PrismaClient();

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePhone(value: unknown): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return normalized.replace(/[\s()-]+/g, "");
}

function normalizeSlug(inputSlug: string | null, fullName: string): string {
  const candidate = inputSlug ?? fullName;
  const normalized = slugify(candidate);

  if (!normalized) {
    throw new Error(`Could not derive a valid slug for ${fullName}`);
  }

  return normalized;
}

function normalizeCategory(value: string): "leadership" | "member" {
  return value.trim().toLowerCase() === "leadership" ? "leadership" : "member";
}

function normalizeSocials(value: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [platform, rawHandle] of Object.entries(value)) {
    const handle = normalizeText(rawHandle);
    if (!handle) continue;
    normalized[platform] = handle;
  }

  return normalized;
}

function normalizeStringArray(values: string[]): string[] {
  return values.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}

function parseCliOptions(argv: string[]): ImportCliOptions {
  let dryRun = true;
  let filePath: string | undefined;

  for (const arg of argv) {
    if (arg === "--apply") {
      dryRun = false;
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg.startsWith("--file=")) {
      const value = arg.slice("--file=".length).trim();
      if (value.length > 0) {
        filePath = value;
      }
    }
  }

  return { dryRun, filePath };
}

function composeMedium(primaryArtForm: string | null, secondaryArtForm: string | null): string | null {
  const parts = [primaryArtForm, secondaryArtForm].filter((entry): entry is string => Boolean(entry));
  if (parts.length === 0) return null;
  return parts.join(" / ");
}

function chooseLongBio(longBio: string | null, shortBio: string | null, fullName: string): string {
  if (longBio) return longBio;
  if (shortBio) return shortBio;
  return `${fullName} is an artist with Art Galore International.`;
}

function normalizePersonRecord(record: CuratedPersonInput): NormalizedPerson {
  const fullName = normalizeText(record.fullName);
  if (!fullName) {
    throw new Error("Record is missing fullName");
  }

  const preferredName = normalizeText(record.preferredName);
  const slug = normalizeSlug(normalizeText(record.slug), fullName);
  const pronunciation = normalizeText(record.pronunciation);
  const email = normalizeText(record.email)?.toLowerCase() ?? null;
  const phone = normalizePhone(record.phone);
  const city = normalizeText(record.city);
  const preferredContactMethod = normalizeText(record.preferredContactMethod);
  const organizationRole = normalizeText(record.organizationRole) ?? (record.category === "leadership" ? "Leadership" : "Member");
  const category = normalizeCategory(record.category);
  const primaryArtForm = normalizeText(record.primaryArtForm);
  const secondaryArtForm = normalizeText(record.secondaryArtForm);
  const yearsPracticing = normalizeText(record.yearsPracticing);
  const artistStatement = normalizeText(record.artistStatement);
  const shortBio = normalizeText(record.shortBio);
  const longBioText = normalizeText(record.longBio);
  const longBio = chooseLongBio(longBioText, shortBio, fullName);
  const quote = normalizeText(record.quote);
  const socials = normalizeSocials(record.socials);
  const eventsParticipatedRaw = normalizeStringArray(record.eventsParticipatedRaw);
  const eventRolesRaw = normalizeStringArray(record.eventRolesRaw);
  const profilePhotoUrl = normalizeText(record.profilePhotoUrl);
  const portfolioImagesUrl = normalizeText(record.portfolioImagesUrl);
  const additionalWorkUrl = normalizeText(record.additionalWorkUrl);
  const importNotes = normalizeText(record.importNotes);

  const metadataOnlyFieldsUsed = METADATA_ONLY_FIELDS.filter((field) => {
    if (field === "socials") return Object.keys(socials).length > 0;
    if (field === "eventsParticipatedRaw") return eventsParticipatedRaw.length > 0;
    if (field === "eventRolesRaw") return eventRolesRaw.length > 0;
    if (field === "interestedInCollaborating") return record.interestedInCollaborating;
    if (field === "additionalWorkUrl") return Boolean(additionalWorkUrl);
    if (field === "importNotes") return Boolean(importNotes);
    return false;
  });

  return {
    fullName,
    preferredName,
    slug,
    pronunciation,
    email,
    phone,
    city,
    preferredContactMethod,
    organizationRole,
    category,
    isArtist: Boolean(record.isArtist),
    primaryArtForm,
    secondaryArtForm,
    yearsPracticing,
    artistStatement,
    shortBio,
    longBio,
    quote,
    medium: composeMedium(primaryArtForm, secondaryArtForm),
    socials,
    eventsParticipatedRaw,
    eventRolesRaw,
    interestedInCollaborating: Boolean(record.interestedInCollaborating),
    profilePhotoUrl,
    portfolioImagesUrl,
    additionalWorkUrl,
    consentGiven: true,
    displayOrder: Number.isFinite(record.displayOrder) ? record.displayOrder : 0,
    importNotes,
    metadataOnlyFieldsUsed,
  };
}

function asObject(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {};
  }

  return value as Record<string, unknown>;
}

function chooseStringUpdate(existing: string | null, curated: string | null): string | undefined {
  if (!curated) return undefined;
  if (!existing || existing.trim().length === 0) return curated;
  return undefined;
}

function chooseLongTextUpdate(existing: string | null, curated: string | null, minGain = 120): string | undefined {
  if (!curated) return undefined;
  if (!existing || existing.trim().length === 0) return curated;
  if (curated.trim().length >= existing.trim().length + minGain) return curated;
  return undefined;
}

function buildImportMetadata(
  normalized: NormalizedPerson,
  rawRecord: CuratedPersonInput,
  existingMetadata: Prisma.JsonValue | null,
): Prisma.InputJsonValue {
  const previous = asObject(existingMetadata);

  return {
    ...previous,
    curatedImport: {
      importedFrom: IMPORT_SOURCE,
      socials: normalized.socials,
      eventsParticipatedRaw: normalized.eventsParticipatedRaw,
      eventRolesRaw: normalized.eventRolesRaw,
      interestedInCollaborating: normalized.interestedInCollaborating,
      additionalWorkUrl: normalized.additionalWorkUrl,
      importNotes: normalized.importNotes,
      mediaReferences: {
        profilePhotoUrl: normalized.profilePhotoUrl,
        portfolioImagesUrl: normalized.portfolioImagesUrl,
      },
      rawSource: rawRecord,
    },
  };
}

function shouldUpdateImportMetadata(existingMetadata: Prisma.JsonValue | null, nextMetadata: Prisma.InputJsonValue) {
  return JSON.stringify(existingMetadata ?? null) !== JSON.stringify(nextMetadata);
}

function buildCreateRoles(normalized: NormalizedPerson): Prisma.PersonRoleCreateWithoutPersonInput[] {
  const teamRole = normalized.category === "leadership" ? PersonRoleType.LEADERSHIP : PersonRoleType.MEMBER;
  const roles: Prisma.PersonRoleCreateWithoutPersonInput[] = [
    {
      role: teamRole,
      title: normalized.organizationRole,
    },
  ];

  if (normalized.isArtist) {
    roles.push({
      role: PersonRoleType.ARTIST,
      title: "Artist",
    });
  }

  return roles;
}

async function ensureRoles(
  tx: Prisma.TransactionClient,
  personId: string,
  existingRoles: PersonRole[],
  normalized: NormalizedPerson,
): Promise<string[]> {
  const actions: string[] = [];
  const desiredTeamRole = normalized.category === "leadership" ? PersonRoleType.LEADERSHIP : PersonRoleType.MEMBER;
  const hasTeamRole = existingRoles.some((role) => role.role === PersonRoleType.LEADERSHIP || role.role === PersonRoleType.MEMBER);

  if (!hasTeamRole) {
    await tx.personRole.create({
      data: {
        personId,
        role: desiredTeamRole,
        title: normalized.organizationRole,
      },
    });
    actions.push(`role:${desiredTeamRole.toLowerCase()}(created)`);
  } else {
    const desiredRole = existingRoles.find((role) => role.role === desiredTeamRole);
    if (desiredRole && !normalizeText(desiredRole.title) && normalizeText(normalized.organizationRole)) {
      await tx.personRole.update({
        where: { id: desiredRole.id },
        data: { title: normalized.organizationRole },
      });
      actions.push(`role:${desiredTeamRole.toLowerCase()}(title-updated)`);
    }
  }

  if (normalized.isArtist && !existingRoles.some((role) => role.role === PersonRoleType.ARTIST)) {
    await tx.personRole.create({
      data: {
        personId,
        role: PersonRoleType.ARTIST,
        title: "Artist",
      },
    });
    actions.push("role:artist(created)");
  }

  return actions;
}

async function findExistingPerson(normalized: NormalizedPerson): Promise<{
  person: PersonWithRoles | null;
  matchedBy?: MatchBy;
  conflicts: Array<{ id: string; by: MatchBy }>;
}> {
  const byEmail = normalized.email
    ? await prisma.person.findMany({
        where: { email: normalized.email },
        include: { roles: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const byFullName = await prisma.person.findMany({
    where: { fullName: normalized.fullName },
    include: { roles: true },
    orderBy: { createdAt: "asc" },
  });

  const bySlug = await prisma.person.findMany({
    where: { slug: normalized.slug },
    include: { roles: true },
    orderBy: { createdAt: "asc" },
  });

  const priority: Array<{ by: MatchBy; matches: PersonWithRoles[] }> = [
    { by: "email", matches: byEmail },
    { by: "fullName", matches: byFullName },
    { by: "slug", matches: bySlug },
  ];

  let selected: PersonWithRoles | null = null;
  let matchedBy: MatchBy | undefined;

  for (const candidate of priority) {
    if (candidate.matches.length > 0) {
      selected = candidate.matches[0] ?? null;
      matchedBy = candidate.by;
      break;
    }
  }

  if (!selected) {
    return { person: null, conflicts: [] };
  }

  const seen = new Map<string, MatchBy>();
  for (const candidate of priority) {
    for (const person of candidate.matches) {
      if (!seen.has(person.id)) {
        seen.set(person.id, candidate.by);
      }
    }
  }

  const conflicts = Array.from(seen.entries())
    .filter(([id]) => id !== selected?.id)
    .map(([id, by]) => ({ id, by }));

  return {
    person: selected,
    matchedBy,
    conflicts,
  };
}

async function createPerson(normalized: NormalizedPerson, rawRecord: CuratedPersonInput): Promise<UpsertResult> {
  const created = await prisma.person.create({
    data: {
      slug: normalized.slug,
      fullName: normalized.fullName,
      preferredName: normalized.preferredName ?? undefined,
      pronunciation: normalized.pronunciation ?? undefined,
      email: normalized.email ?? undefined,
      phone: normalized.phone ?? undefined,
      city: normalized.city ?? undefined,
      preferredContactMethod: normalized.preferredContactMethod ?? undefined,
      headline: normalized.organizationRole,
      bio: normalized.longBio,
      shortBio: normalized.shortBio ?? undefined,
      quote: normalized.quote ?? undefined,
      artistStatement: normalized.artistStatement ?? undefined,
      medium: normalized.medium ?? undefined,
      primaryArtForm: normalized.primaryArtForm ?? undefined,
      secondaryArtForm: normalized.secondaryArtForm ?? undefined,
      yearsPracticing: normalized.yearsPracticing ?? undefined,
      displayOrder: normalized.displayOrder,
      status: PersonStatus.ACTIVE,
      importedFrom: IMPORT_SOURCE,
      consentGiven: normalized.consentGiven,
      importMetadata: buildImportMetadata(normalized, rawRecord, null),
      roles: {
        create: buildCreateRoles(normalized),
      },
    },
  });

  const manualReviewNotes = normalized.importNotes ? [normalized.importNotes] : [];

  return {
    action: "created",
    personId: created.id,
    fullName: normalized.fullName,
    changedFields: [
      "fullName",
      "slug",
      "headline",
      "bio",
      "status",
      "roles",
      "importedFrom",
      "importMetadata",
    ],
    metadataFieldsStored: normalized.metadataOnlyFieldsUsed,
    manualReviewNotes,
  };
}

async function updatePerson(
  existing: PersonWithRoles,
  normalized: NormalizedPerson,
  rawRecord: CuratedPersonInput,
  matchedBy: MatchBy,
): Promise<UpsertResult> {
  const updateData: Prisma.PersonUpdateInput = {};
  const changedFields: string[] = [];

  const setField = (field: string, value: unknown) => {
    if (value === undefined) return;
    (updateData as Record<string, unknown>)[field] = value;
    changedFields.push(field);
  };

  setField("preferredName", chooseStringUpdate(existing.preferredName, normalized.preferredName));
  setField("pronunciation", chooseStringUpdate(existing.pronunciation, normalized.pronunciation));
  setField("email", chooseStringUpdate(existing.email, normalized.email));
  setField("phone", chooseStringUpdate(existing.phone, normalized.phone));
  setField("city", chooseStringUpdate(existing.city, normalized.city));
  setField(
    "preferredContactMethod",
    chooseStringUpdate(existing.preferredContactMethod, normalized.preferredContactMethod),
  );
  setField("headline", chooseStringUpdate(existing.headline, normalized.organizationRole));
  setField("shortBio", chooseLongTextUpdate(existing.shortBio, normalized.shortBio, 60));
  setField("bio", chooseLongTextUpdate(existing.bio, normalized.longBio));
  setField("quote", chooseStringUpdate(existing.quote, normalized.quote));
  setField("artistStatement", chooseLongTextUpdate(existing.artistStatement, normalized.artistStatement, 80));
  setField("medium", chooseStringUpdate(existing.medium, normalized.medium));
  setField("primaryArtForm", chooseStringUpdate(existing.primaryArtForm, normalized.primaryArtForm));
  setField("secondaryArtForm", chooseStringUpdate(existing.secondaryArtForm, normalized.secondaryArtForm));
  setField("yearsPracticing", chooseStringUpdate(existing.yearsPracticing, normalized.yearsPracticing));
  if ((existing.displayOrder ?? 0) <= 0 && normalized.displayOrder > 0) {
    setField("displayOrder", normalized.displayOrder);
  } else if (existing.importedFrom === IMPORT_SOURCE && existing.displayOrder !== normalized.displayOrder) {
    setField("displayOrder", normalized.displayOrder);
  }

  if (!existing.importedFrom) {
    setField("importedFrom", IMPORT_SOURCE);
  }

  if (existing.consentGiven !== true) {
    setField("consentGiven", true);
  }

  const nextImportMetadata = buildImportMetadata(normalized, rawRecord, existing.importMetadata);
  if (shouldUpdateImportMetadata(existing.importMetadata, nextImportMetadata)) {
    setField("importMetadata", nextImportMetadata);
  }

  const roleActions = await prisma.$transaction(async (tx) => {
    if (changedFields.length > 0) {
      await tx.person.update({
        where: { id: existing.id },
        data: updateData,
      });
    }

    return ensureRoles(tx, existing.id, existing.roles, normalized);
  });

  changedFields.push(...roleActions);

  const manualReviewNotes = normalized.importNotes ? [normalized.importNotes] : [];

  return {
    action: changedFields.length > 0 ? "updated" : "unchanged",
    personId: existing.id,
    fullName: normalized.fullName,
    matchedBy,
    changedFields,
    metadataFieldsStored: normalized.metadataOnlyFieldsUsed,
    manualReviewNotes,
  };
}

function getPreviewChangedFields(existing: PersonWithRoles, normalized: NormalizedPerson) {
  const changedFields: string[] = [];
  const setField = (field: string, value: unknown) => {
    if (value === undefined) return;
    changedFields.push(field);
  };

  setField("preferredName", chooseStringUpdate(existing.preferredName, normalized.preferredName));
  setField("pronunciation", chooseStringUpdate(existing.pronunciation, normalized.pronunciation));
  setField("email", chooseStringUpdate(existing.email, normalized.email));
  setField("phone", chooseStringUpdate(existing.phone, normalized.phone));
  setField("city", chooseStringUpdate(existing.city, normalized.city));
  setField(
    "preferredContactMethod",
    chooseStringUpdate(existing.preferredContactMethod, normalized.preferredContactMethod),
  );
  setField("headline", chooseStringUpdate(existing.headline, normalized.organizationRole));
  setField("shortBio", chooseLongTextUpdate(existing.shortBio, normalized.shortBio, 60));
  setField("bio", chooseLongTextUpdate(existing.bio, normalized.longBio));
  setField("quote", chooseStringUpdate(existing.quote, normalized.quote));
  setField("artistStatement", chooseLongTextUpdate(existing.artistStatement, normalized.artistStatement, 80));
  setField("medium", chooseStringUpdate(existing.medium, normalized.medium));
  setField("primaryArtForm", chooseStringUpdate(existing.primaryArtForm, normalized.primaryArtForm));
  setField("secondaryArtForm", chooseStringUpdate(existing.secondaryArtForm, normalized.secondaryArtForm));
  setField("yearsPracticing", chooseStringUpdate(existing.yearsPracticing, normalized.yearsPracticing));
  if ((existing.displayOrder ?? 0) <= 0 && normalized.displayOrder > 0) {
    changedFields.push("displayOrder");
  } else if (existing.importedFrom === IMPORT_SOURCE && existing.displayOrder !== normalized.displayOrder) {
    changedFields.push("displayOrder");
  }

  if (!existing.importedFrom) {
    changedFields.push("importedFrom");
  }

  if (existing.consentGiven !== true) {
    changedFields.push("consentGiven");
  }

  const desiredTeamRole = normalized.category === "leadership" ? PersonRoleType.LEADERSHIP : PersonRoleType.MEMBER;
  const hasTeamRole = existing.roles.some((role) => role.role === PersonRoleType.LEADERSHIP || role.role === PersonRoleType.MEMBER);
  if (!hasTeamRole) {
    changedFields.push(`role:${desiredTeamRole.toLowerCase()}(created)`);
  } else {
    const desiredRole = existing.roles.find((role) => role.role === desiredTeamRole);
    if (desiredRole && !normalizeText(desiredRole.title) && normalizeText(normalized.organizationRole)) {
      changedFields.push(`role:${desiredTeamRole.toLowerCase()}(title-updated)`);
    }
  }

  if (normalized.isArtist && !existing.roles.some((role) => role.role === PersonRoleType.ARTIST)) {
    changedFields.push("role:artist(created)");
  }

  return changedFields;
}

function previewUpdatePerson(
  existing: PersonWithRoles,
  normalized: NormalizedPerson,
  matchedBy: MatchBy,
): UpsertResult {
  const changedFields = getPreviewChangedFields(existing, normalized);
  const manualReviewNotes = normalized.importNotes ? [normalized.importNotes] : [];

  return {
    action: changedFields.length > 0 ? "updated" : "unchanged",
    personId: existing.id,
    fullName: normalized.fullName,
    matchedBy,
    changedFields,
    metadataFieldsStored: normalized.metadataOnlyFieldsUsed,
    manualReviewNotes,
  };
}

function getInputRecords(filePath?: string) {
  return loadSpreadsheetCuratedPeople(curatedPeoplePayload, { filePath });
}

async function runImport(options: ImportCliOptions) {
  const sourceRecords = getInputRecords(options.filePath);
  const results: UpsertResult[] = [];
  const metadataFieldsLogged = new Set<string>();

  for (const rawRecord of sourceRecords) {
    const normalized = normalizePersonRecord(rawRecord);
    normalized.metadataOnlyFieldsUsed.forEach((field) => metadataFieldsLogged.add(field));

    const lookup = await findExistingPerson(normalized);

    if (lookup.conflicts.length > 0) {
      const conflictText = lookup.conflicts.map((entry) => `${entry.id} (${entry.by})`).join(", ");
      console.warn(
        `[WARN] ${normalized.fullName}: additional match candidates found [${conflictText}]. Using ${lookup.person?.id ?? "none"} by ${lookup.matchedBy ?? "n/a"}.`,
      );
    }

    if (!lookup.person) {
      const created = options.dryRun
        ? {
            action: "created" as const,
            personId: "(new)",
            fullName: normalized.fullName,
            changedFields: ["create"],
            metadataFieldsStored: normalized.metadataOnlyFieldsUsed,
            manualReviewNotes: normalized.importNotes ? [normalized.importNotes] : [],
          }
        : await createPerson(normalized, rawRecord);
      results.push(created);
      console.log(`${options.dryRun ? "[DRY-RUN CREATE]" : "[CREATE]"} ${created.fullName} (${created.personId})`);
      continue;
    }

    const updated = options.dryRun
      ? previewUpdatePerson(lookup.person, normalized, lookup.matchedBy ?? "slug")
      : await updatePerson(lookup.person, normalized, rawRecord, lookup.matchedBy ?? "slug");
    results.push(updated);

    if (updated.action === "unchanged") {
      console.log(`${options.dryRun ? "[DRY-RUN SKIP]" : "[SKIP]"} ${updated.fullName} (${updated.personId}) already had stronger/equivalent data.`);
    } else {
      console.log(
        `${options.dryRun ? "[DRY-RUN UPDATE]" : "[UPDATE]"} ${updated.fullName} (${updated.personId}) via ${updated.matchedBy}; changed: ${updated.changedFields.join(", ")}`,
      );
    }
  }

  const created = results.filter((entry) => entry.action === "created");
  const updated = results.filter((entry) => entry.action === "updated");
  const unchanged = results.filter((entry) => entry.action === "unchanged");
  const manualReview = results
    .filter((entry) => entry.manualReviewNotes.length > 0)
    .map((entry) => ({ fullName: entry.fullName, notes: entry.manualReviewNotes }));

  console.log(`\n=== Curated People Import Summary (${options.dryRun ? "DRY-RUN" : "APPLY"}) ===`);
  console.log(`Total records processed: ${results.length}`);
  console.log(`Created: ${created.length}`);
  console.log(`Updated: ${updated.length}`);
  console.log(`Unchanged: ${unchanged.length}`);

  if (created.length > 0) {
    console.log("\nCreated records:");
    created.forEach((entry) => {
      console.log(`- ${entry.fullName} (${entry.personId})`);
    });
  }

  if (updated.length > 0) {
    console.log("\nUpdated records:");
    updated.forEach((entry) => {
      console.log(`- ${entry.fullName} (${entry.personId}) fields: ${entry.changedFields.join(", ")}`);
    });
  }

  if (Array.from(metadataFieldsLogged).length > 0) {
    console.log("\nFields stored in import metadata/notes:");
    Array.from(metadataFieldsLogged)
      .sort()
      .forEach((field) => console.log(`- ${field}`));
  }

  if (manualReview.length > 0) {
    console.log("\nManual review flags:");
    manualReview.forEach((entry) => {
      console.log(`- ${entry.fullName}: ${entry.notes.join(" | ")}`);
    });
  }
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));

  console.log(`[INFO] Curated people import mode: ${options.dryRun ? "dry-run" : "apply"}`);
  if (options.filePath) {
    console.log(`[INFO] Spreadsheet override: ${options.filePath}`);
  }

  try {
    await runImport(options);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error("Curated people import failed.", error);
  await prisma.$disconnect();
  process.exit(1);
});
