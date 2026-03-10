function normalizeBaseUrl(value?: string) {
  if (!value) return "/api";
  return value.endsWith("/") ? value.slice(0, -1) : value;
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
