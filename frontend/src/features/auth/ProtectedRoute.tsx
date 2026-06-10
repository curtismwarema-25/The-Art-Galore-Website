import { Navigate, useLocation } from "react-router-dom";
import type { UserRole } from "@/types/models";
import { useAuth } from "@/features/auth/useAuth";

type ProtectedRouteProps = {
  allowedRoles: UserRole[];
  children: React.ReactNode;
};

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-sm text-foreground-secondary">Checking access...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (!hasRole(allowedRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl mb-2">Access Restricted</h1>
          <p className="text-sm text-foreground-secondary">You do not have permission to view this section.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
