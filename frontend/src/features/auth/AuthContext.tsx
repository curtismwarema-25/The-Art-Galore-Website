import { useMemo, useState } from "react";
import { ApiError } from "@/api/client";
import { useLoginMutation } from "@/hooks/mutations/useLoginMutation";
import { useLogoutMutation } from "@/hooks/mutations/useLogoutMutation";
import { useCurrentUserQuery } from "@/hooks/queries/useCurrentUserQuery";
import { AuthContext, type AuthContextValue } from "@/features/auth/authContextCore";

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
