export const DEFAULT_EVENT_TIMEZONE = "Africa/Nairobi";

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormatter(timeZone: string) {
  const cached = dateTimeFormatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  dateTimeFormatterCache.set(timeZone, formatter);
  return formatter;
}

function getDateTimeParts(date: Date, timeZone: string): DateTimeParts {
  const parts = getDateTimeFormatter(timeZone).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day")),
    hour: Number(values.get("hour")),
    minute: Number(values.get("minute")),
    second: Number(values.get("second")),
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateTimeInput(date: Date, timeZone: string) {
  const parts = getDateTimeParts(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function parseDateTimeInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (month < 1 || month > 12 || hour > 23 || minute > 59) return null;

  const wallTimeMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const check = new Date(wallTimeMs);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute
  ) {
    return null;
  }

  return { wallTimeMs, input: value };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getDateTimeParts(date, timeZone);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - date.getTime();
}

function getCandidateOffsets(wallTimeMs: number, timeZone: string) {
  const offsets = new Set<number>();
  const sixHours = 6 * 60 * 60 * 1000;

  for (let offset = -48 * 60 * 60 * 1000; offset <= 48 * 60 * 60 * 1000; offset += sixHours) {
    offsets.add(getTimeZoneOffsetMs(new Date(wallTimeMs + offset), timeZone));
  }

  return offsets;
}

export function getSafeEventTimezone(timeZone?: string) {
  const candidate = timeZone?.trim() || DEFAULT_EVENT_TIMEZONE;

  try {
    getDateTimeFormatter(candidate).format(new Date());
    return candidate;
  } catch {
    return DEFAULT_EVENT_TIMEZONE;
  }
}

export function toEventDateTimeInput(isoDateTime?: string, timeZone?: string) {
  if (!isoDateTime) return "";

  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "";

  return formatDateTimeInput(date, getSafeEventTimezone(timeZone));
}

export function toEventIsoString(localDateTime: string, timeZone?: string) {
  const parsed = parseDateTimeInput(localDateTime);
  if (!parsed) throw new Error("Enter a valid date and time.");

  const safeTimeZone = getSafeEventTimezone(timeZone);
  const candidates = [...getCandidateOffsets(parsed.wallTimeMs, safeTimeZone)]
    .map((offset) => new Date(parsed.wallTimeMs - offset))
    .filter((candidate) => formatDateTimeInput(candidate, safeTimeZone) === parsed.input);

  if (candidates.length === 0) {
    throw new Error(`The selected date and time does not exist in ${safeTimeZone}.`);
  }

  if (candidates.length > 1) {
    throw new Error(`The selected date and time is ambiguous in ${safeTimeZone}. Choose a different time.`);
  }

  return candidates[0].toISOString();
}

export function formatEventDateTime(isoDateTime: string, timeZone?: string) {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-KE", {
    timeZone: getSafeEventTimezone(timeZone),
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
