import { ValidationError } from "../../common/errors/httpErrors.js";

export const DEFAULT_EVENT_TIMEZONE = "Africa/Nairobi";

export function isValidEventTimezone(value: string): boolean {
  const timezone = value.trim();
  if (!timezone) return false;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates an administrator-provided timezone. Missing values use the
 * established default, while an explicitly invalid value is rejected.
 */
export function validateConfiguredEventTimezone(value?: string | null): string {
  if (value === undefined || value === null) return DEFAULT_EVENT_TIMEZONE;

  const timezone = value.trim();
  if (!isValidEventTimezone(timezone)) {
    throw new ValidationError("timezone must be a valid IANA timezone identifier");
  }

  return timezone;
}

/**
 * Resolves persisted data for serialization. Existing legacy records may
 * contain invalid values, so they fall back safely without changing storage.
 */
export function getEffectiveEventTimezone(value?: string | null): string {
  const timezone = value?.trim();
  return timezone && isValidEventTimezone(timezone) ? timezone : DEFAULT_EVENT_TIMEZONE;
}
