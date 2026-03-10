import { ApiError, apiRequest } from "@/api/client";
import type { UserRole } from "@/types/models";

type BackendRole = "ADMIN" | "STAFF" | "MODERATOR";
type BackendStatus = "ACTIVE" | "DISABLED";

type BackendAuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: BackendRole;
  status: BackendStatus;
  lastLoginAt: string | null;
};

type MeResponse = {
  data: {
    user: BackendAuthUser;
  };
};

type LoginResponse = {
  data: {
    user: BackendAuthUser;
    sessionExpiresAt: string;
  };
};

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: Exclude<UserRole, "public">;
  status: "active" | "disabled";
  lastLoginAt: string | null;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResult = {
  user: AuthUser;
  sessionExpiresAt: string;
};

const roleMap: Record<BackendRole, Exclude<UserRole, "public">> = {
  ADMIN: "admin",
  STAFF: "staff",
  MODERATOR: "moderator",
};

const statusMap: Record<BackendStatus, AuthUser["status"]> = {
  ACTIVE: "active",
  DISABLED: "disabled",
};

function mapAuthUser(user: BackendAuthUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: roleMap[user.role],
    status: statusMap[user.status],
    lastLoginAt: user.lastLoginAt,
  };
}

export async function getCurrentUser() {
  try {
    const response = await apiRequest<MeResponse>("/auth/me", { method: "GET" });
    return mapAuthUser(response.data.user);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const response = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: input,
  });

  return {
    user: mapAuthUser(response.data.user),
    sessionExpiresAt: response.data.sessionExpiresAt,
  };
}

export async function logout() {
  await apiRequest<void>("/auth/logout", {
    method: "POST",
  });
}
