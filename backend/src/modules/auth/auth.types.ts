import type { AuthUser, UserRole, UserStatus } from "@prisma/client";

export type SafeAuthUser = Pick<
  AuthUser,
  "id" | "email" | "fullName" | "role" | "status" | "lastLoginAt" | "createdAt" | "updatedAt"
>;

export type AuthSessionContext = {
  sessionId: string;
  user: SafeAuthUser;
  expiresAt: Date;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResult = {
  sessionToken: string;
  sessionExpiresAt: Date;
  user: SafeAuthUser;
};

export type AuthPublicUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
};

export function toAuthPublicUser(user: SafeAuthUser): AuthPublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}
