import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import XLSX from "xlsx";
import { slugify } from "../common/utils/slug.js";
import type { CuratedPersonInput } from "./curatedPeoplePayload.js";

const NULL_TOKENS = new Set(["", "n/a", "na", "none", "nil", "null", "-"]);

type RowData = Record<string, unknown>;

type ParsedSpreadsheetRecord = {
  timestamp: string | null;
  emailPrimary: string | null;
  fullName: string | null;
  preferredName: string | null;
  pronunciation: string | null;
  phone: string | null;
  emailSecondary: string | null;
  city: string | null;
  preferredContactMethod: string | null;
  organizationRole: string | null;
  isArtist: boolean;
  primaryArtForm: string | null;
  secondaryArtForm: string | null;
  yearsPracticing: string | null;
  artistStatement: string | null;
  shortBio: string | null;
  longBio: string | null;
  quote: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  xHandle: string | null;
  youtube: string | null;
  website: string | null;
  eventsParticipated: string[];
  eventRoles: string[];
  interestedInCollaborating: boolean;
  profilePhotoUrl: string | null;
  portfolioImagesUrl: string | null;
  additionalWorkUrl: string | null;
  consentGiven: boolean;
  rawSource: RowData;
};

export type SpreadsheetParseOptions = {
  filePath?: string;
};

function normalizeForMatch(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCellText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toISOString();

  const text = String(value).replace(/\u00a0/g, " ").trim();
  if (text.length === 0) return null;
  if (NULL_TOKENS.has(text.toLowerCase())) return null;
  return text;
}

function normalizePhone(value: unknown): string | null {
  const text = normalizeCellText(value);
  if (!text) return null;
  return text.replace(/[^\d+]/g, "").replace(/^00/, "+");
}

function toBooleanYesNo(value: unknown) {
  const text = normalizeCellText(value);
  if (!text) return false;
  const normalized = text.toLowerCase();
  if (normalized.includes("yes")) return true;
  if (normalized.includes("no")) return false;
  return false;
}

function parseCsvMulti(value: unknown) {
  const text = normalizeCellText(value);
  if (!text) return [];
  return text
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !NULL_TOKENS.has(item.toLowerCase()));
}

function deriveCategoryFromRole(role: string | null): "leadership" | "member" {
  if (!role) return "member";
  const normalized = role.toLowerCase();
  if (normalized.includes("chair")) return "leadership";
  if (normalized.includes("communicat")) return "leadership";
  if (normalized.includes("public relations")) return "leadership";
  if (normalized === "member") return "member";
  return "member";
}

function chooseHeader(headers: string[], includesAll: string[]) {
  const target = includesAll.map((item) => normalizeForMatch(item));

  return headers.find((header) => {
    const normalized = normalizeForMatch(header);
    return target.every((token) => normalized.includes(token));
  });
}

function getField(row: RowData, header?: string) {
  if (!header) return null;
  return row[header] ?? null;
}

function resolveSpreadsheetPath(explicitPath?: string) {
  if (explicitPath && existsSync(explicitPath)) return explicitPath;

  const envPath = process.env.CURATED_PEOPLE_SPREADSHEET_PATH;
  if (envPath && existsSync(envPath)) return envPath;

  const defaultPath = join(homedir(), "Downloads", "Art Galore International – Member & Artist Profile Information (Responses).xlsx");
  if (existsSync(defaultPath)) return defaultPath;

  throw new Error(
    "Could not find spreadsheet. Provide --file=<path> or set CURATED_PEOPLE_SPREADSHEET_PATH.",
  );
}

function parseSpreadsheetRows(filePath: string): ParsedSpreadsheetRecord[] {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Spreadsheet has no sheets");
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("Spreadsheet first sheet could not be read");

  const rows = XLSX.utils.sheet_to_json<RowData>(sheet, { defval: null, raw: true });
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0] ?? {});
  const H = {
    timestamp: chooseHeader(headers, ["timestamp"]),
    email1: chooseHeader(headers, ["email address"]),
    fullName: chooseHeader(headers, ["full name", "legal name"]),
    preferredName: chooseHeader(headers, ["preferred name", "stage name"]),
    pronunciation: chooseHeader(headers, ["pronunciation of name"]),
    phone: chooseHeader(headers, ["phone number"]),
    email2: chooseHeader(headers, ["email address 2"]),
    city: chooseHeader(headers, ["city", "location"]),
    preferredContactMethod: chooseHeader(headers, ["preferred contact method"]),
    organizationRole: chooseHeader(headers, ["role in the organization"]),
    isArtist: chooseHeader(headers, ["are you also an artist"]),
    primaryArtForm: chooseHeader(headers, ["primary art form"]),
    secondaryArtForm: chooseHeader(headers, ["secondary art form"]),
    yearsPracticing: chooseHeader(headers, ["years practicing your art"]),
    artistStatement: chooseHeader(headers, ["artist statement"]),
    shortBio: chooseHeader(headers, ["short bio", "website profile"]),
    longBio: chooseHeader(headers, ["long bio"]),
    quote: chooseHeader(headers, ["short quote", "tagline"]),
    instagram: chooseHeader(headers, ["instagram handle"]),
    tiktok: chooseHeader(headers, ["tiktok username"]),
    facebook: chooseHeader(headers, ["facebook profile", "url"]),
    xHandle: chooseHeader(headers, ["x / twitter handle"]),
    youtube: chooseHeader(headers, ["youtube channel link"]),
    website: chooseHeader(headers, ["website or portfolio link"]),
    eventsParticipated: chooseHeader(headers, ["which art galore events have you participated in"]),
    eventRoles: chooseHeader(headers, ["what role do you usually play at events"]),
    interestedInCollaborating: chooseHeader(headers, ["interested in collaborating"]),
    profilePhotoUrl: chooseHeader(headers, ["upload your profile photo"]),
    portfolioImagesUrl: chooseHeader(headers, ["upload 3-5 images"]),
    additionalWorkUrl: chooseHeader(headers, ["provide a link to additional work"]),
    consentGiven: chooseHeader(headers, ["consent to publish your information"]),
  };

  return rows.map((row: RowData) => ({
    timestamp: normalizeCellText(getField(row, H.timestamp)),
    emailPrimary: normalizeCellText(getField(row, H.email1))?.toLowerCase() ?? null,
    fullName: normalizeCellText(getField(row, H.fullName)),
    preferredName: normalizeCellText(getField(row, H.preferredName)),
    pronunciation: normalizeCellText(getField(row, H.pronunciation)),
    phone: normalizePhone(getField(row, H.phone)),
    emailSecondary: normalizeCellText(getField(row, H.email2))?.toLowerCase() ?? null,
    city: normalizeCellText(getField(row, H.city)),
    preferredContactMethod: normalizeCellText(getField(row, H.preferredContactMethod)),
    organizationRole: normalizeCellText(getField(row, H.organizationRole)),
    isArtist: toBooleanYesNo(getField(row, H.isArtist)),
    primaryArtForm: normalizeCellText(getField(row, H.primaryArtForm)),
    secondaryArtForm: normalizeCellText(getField(row, H.secondaryArtForm)),
    yearsPracticing: normalizeCellText(getField(row, H.yearsPracticing)),
    artistStatement: normalizeCellText(getField(row, H.artistStatement)),
    shortBio: normalizeCellText(getField(row, H.shortBio)),
    longBio: normalizeCellText(getField(row, H.longBio)),
    quote: normalizeCellText(getField(row, H.quote)),
    instagram: normalizeCellText(getField(row, H.instagram)),
    tiktok: normalizeCellText(getField(row, H.tiktok)),
    facebook: normalizeCellText(getField(row, H.facebook)),
    xHandle: normalizeCellText(getField(row, H.xHandle)),
    youtube: normalizeCellText(getField(row, H.youtube)),
    website: normalizeCellText(getField(row, H.website)),
    eventsParticipated: parseCsvMulti(getField(row, H.eventsParticipated)),
    eventRoles: parseCsvMulti(getField(row, H.eventRoles)),
    interestedInCollaborating: toBooleanYesNo(getField(row, H.interestedInCollaborating)),
    profilePhotoUrl: normalizeCellText(getField(row, H.profilePhotoUrl)),
    portfolioImagesUrl: normalizeCellText(getField(row, H.portfolioImagesUrl)),
    additionalWorkUrl: normalizeCellText(getField(row, H.additionalWorkUrl)),
    consentGiven: toBooleanYesNo(getField(row, H.consentGiven)),
    rawSource: row,
  }));
}

function matchCuratedRecord(
  row: ParsedSpreadsheetRecord,
  curatedByEmail: Map<string, CuratedPersonInput>,
  curatedByFullName: Map<string, CuratedPersonInput>,
): CuratedPersonInput | null {
  if (row.emailSecondary && curatedByEmail.has(row.emailSecondary)) return curatedByEmail.get(row.emailSecondary) ?? null;
  if (row.emailPrimary && curatedByEmail.has(row.emailPrimary)) return curatedByEmail.get(row.emailPrimary) ?? null;
  if (row.fullName && curatedByFullName.has(normalizeForMatch(row.fullName))) return curatedByFullName.get(normalizeForMatch(row.fullName)) ?? null;
  return null;
}

export function loadSpreadsheetCuratedPeople(
  curatedPayload: CuratedPersonInput[],
  options: SpreadsheetParseOptions = {},
): CuratedPersonInput[] {
  const filePath = resolveSpreadsheetPath(options.filePath);
  const rows = parseSpreadsheetRows(filePath);

  const curatedByEmail = new Map<string, CuratedPersonInput>();
  const curatedByFullName = new Map<string, CuratedPersonInput>();
  curatedPayload.forEach((person) => {
    if (person.email?.trim()) curatedByEmail.set(person.email.trim().toLowerCase(), person);
    curatedByFullName.set(normalizeForMatch(person.fullName), person);
  });

  return rows
    .filter((row) => row.fullName && row.consentGiven)
    .map((row, index) => {
      const curated = matchCuratedRecord(row, curatedByEmail, curatedByFullName);
      const fullName = row.fullName ?? curated?.fullName ?? `Unknown ${index + 1}`;
      const normalizedSlug = slugify(curated?.slug ?? row.preferredName ?? fullName) || slugify(fullName);
      const organizationRole = row.organizationRole ?? curated?.organizationRole ?? "Member";
      const category = curated?.category ?? deriveCategoryFromRole(organizationRole);
      const email = row.emailSecondary ?? row.emailPrimary ?? curated?.email ?? "";

      return {
        fullName,
        preferredName: row.preferredName ?? curated?.preferredName ?? null,
        slug: normalizedSlug,
        pronunciation: row.pronunciation ?? curated?.pronunciation ?? null,
        email,
        phone: row.phone ?? curated?.phone ?? "",
        city: row.city ?? curated?.city ?? "",
        preferredContactMethod: row.preferredContactMethod ?? curated?.preferredContactMethod ?? null,
        organizationRole,
        category,
        isArtist: row.isArtist || Boolean(curated?.isArtist),
        primaryArtForm: row.primaryArtForm ?? curated?.primaryArtForm ?? null,
        secondaryArtForm: row.secondaryArtForm ?? curated?.secondaryArtForm ?? null,
        yearsPracticing: row.yearsPracticing ?? curated?.yearsPracticing ?? null,
        artistStatement: curated?.artistStatement ?? row.artistStatement ?? null,
        shortBio: curated?.shortBio ?? row.shortBio ?? `${fullName} is part of Art Galore International.`,
        longBio: curated?.longBio ?? row.longBio ?? row.shortBio ?? `${fullName} is an artist with Art Galore International.`,
        quote: curated?.quote ?? row.quote ?? null,
        socials: {
          ...(row.instagram ? { instagram: row.instagram } : {}),
          ...(row.tiktok ? { tiktok: row.tiktok } : {}),
          ...(row.facebook ? { facebook: row.facebook } : {}),
          ...(row.xHandle ? { x: row.xHandle } : {}),
          ...(row.youtube ? { youtube: row.youtube } : {}),
          ...(row.website ? { website: row.website } : {}),
        },
        eventsParticipatedRaw: row.eventsParticipated,
        eventRolesRaw: row.eventRoles,
        interestedInCollaborating: row.interestedInCollaborating,
        profilePhotoUrl: row.profilePhotoUrl ?? curated?.profilePhotoUrl ?? null,
        portfolioImagesUrl: row.portfolioImagesUrl ?? curated?.portfolioImagesUrl ?? null,
        additionalWorkUrl: row.additionalWorkUrl ?? curated?.additionalWorkUrl ?? null,
        consentGiven: row.consentGiven,
        displayOrder: curated?.displayOrder ?? index + 1,
        importNotes: curated?.importNotes,
      } satisfies CuratedPersonInput;
    });
}
