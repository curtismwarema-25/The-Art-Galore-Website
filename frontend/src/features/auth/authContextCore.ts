import { createContext } from "react";
import type { AuthUser, LoginInput } from "@/api/endpoints/auth";
import type { UserRole } from "@/types/models";

export type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  loginError: string | null;
  hasRole: (roles: UserRole[]) => boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  clearLoginError: () => void;
  refreshSession: () => Promise<AuthUser | null>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
