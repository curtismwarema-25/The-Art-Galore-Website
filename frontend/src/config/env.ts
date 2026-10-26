function normalizeBaseUrl(value?: string) {
  if (!value) return "/api";

  const normalized = value.replace(/\/+$/, "");
  if (normalized.startsWith("/")) return normalized;

  try {
    const url = new URL(normalized);
    if (url.pathname === "/") return `${url.origin}/api`;
  } catch {
    // Keep the configured value intact so a malformed URL remains visible at request time.
  }

  return normalized;
}

export const env = {
  appEnv: import.meta.env.VITE_APP_ENV ?? "development",
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
  enableAdmin: import.meta.env.VITE_ENABLE_ADMIN !== "false",
} as const;

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${env.apiBaseUrl}${normalizedPath}`;
}
