export const DEFAULT_EVENT_TIMEZONE = "Africa/Nairobi";

function getSafeTimezone(timezone?: string) {
  const candidate = timezone?.trim() || DEFAULT_EVENT_TIMEZONE;

  try {
    new Intl.DateTimeFormat("en-KE", { timeZone: candidate }).format();
    return candidate;
  } catch {
    return DEFAULT_EVENT_TIMEZONE;
  }
}

export function formatOrderDateTime(value: string, timezone?: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-KE", {
    timeZone: getSafeTimezone(timezone),
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
