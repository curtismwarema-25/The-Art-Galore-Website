import { createContext, useContext, useMemo, useState } from "react";
import { ApiError } from "@/api/client";
import type { AuthUser, LoginInput } from "@/api/endpoints/auth";
import { useLoginMutation } from "@/hooks/mutations/useLoginMutation";
import { useLogoutMutation } from "@/hooks/mutations/useLogoutMutation";
import { useCurrentUserQuery } from "@/hooks/queries/useCurrentUserQuery";
import type { UserRole } from "@/types/models";

type AuthContextValue = {
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

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loginError, setLoginError] = useState<string | null>(null);

  const currentUserQuery = useCurrentUserQuery();
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  const user = currentUserQuery.data ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: currentUserQuery.isLoading,
      isAuthenticated: Boolean(user),
      isLoggingIn: loginMutation.isPending,
      isLoggingOut: logoutMutation.isPending,
      loginError,
      hasRole: (roles) => Boolean(user && roles.includes(user.role)),
      login: async (input) => {
        setLoginError(null);

        try {
          const result = await loginMutation.mutateAsync(input);
          return result.user;
        } catch (error) {
          if (error instanceof ApiError) {
            setLoginError(error.message);
          } else if (error instanceof Error) {
            setLoginError(error.message);
          } else {
            setLoginError("Unable to sign in. Please try again.");
          }

          throw error;
        }
      },
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
      clearLoginError: () => setLoginError(null),
      refreshSession: async () => {
        const response = await currentUserQuery.refetch();
        return response.data ?? null;
      },
    }),
    [currentUserQuery, loginError, loginMutation, logoutMutation, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
