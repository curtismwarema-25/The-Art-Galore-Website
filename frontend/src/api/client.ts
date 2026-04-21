import { apiUrl } from "@/config/env";

export type ApiStubResponse<T> = Promise<T>;

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function clone<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export async function resolveStub<T>(data: T, delayMs = 120): ApiStubResponse<T> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return clone(data);
}

export async function rejectStub(message: string): Promise<never> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  throw new Error(message);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: "include",
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    payload = await response.json();
  }

  if (!response.ok) {
    const errorPayload = payload as
      | {
          error?: {
            code?: string;
            message?: string;
            details?: unknown;
          };
        }
      | null;

    throw new ApiError(
      errorPayload?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      errorPayload?.error?.code,
      errorPayload?.error?.details,
    );
  }

  return payload as T;
}

export { apiUrl };
