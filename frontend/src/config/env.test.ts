import { afterEach, describe, expect, it, vi } from "vitest";

async function loadApiUrl(baseUrl: string | undefined) {
  vi.resetModules();
  vi.stubEnv("VITE_API_BASE_URL", baseUrl);
  const { apiUrl } = await import("./env");
  return apiUrl;
}

describe("apiUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to the local /api proxy", async () => {
    const apiUrl = await loadApiUrl(undefined);
    expect(apiUrl("/auth/me")).toBe("/api/auth/me");
  });

  it("adds /api to an absolute origin without a path", async () => {
    const apiUrl = await loadApiUrl("https://api.theartgaloreinternational.co.ke");
    expect(apiUrl("/auth/me")).toBe("https://api.theartgaloreinternational.co.ke/api/auth/me");
  });

  it("preserves an absolute base URL that already ends in /api", async () => {
    const apiUrl = await loadApiUrl("https://api.theartgaloreinternational.co.ke/api/");
    expect(apiUrl("/auth/me")).toBe("https://api.theartgaloreinternational.co.ke/api/auth/me");
  });

  it("handles paths with or without a leading slash", async () => {
    const apiUrl = await loadApiUrl("https://api.theartgaloreinternational.co.ke");
    expect(apiUrl("/auth/me")).toBe("https://api.theartgaloreinternational.co.ke/api/auth/me");
    expect(apiUrl("auth/me")).toBe("https://api.theartgaloreinternational.co.ke/api/auth/me");
  });
});
