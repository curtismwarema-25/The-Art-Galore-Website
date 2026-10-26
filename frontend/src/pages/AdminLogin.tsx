import { useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";
import { adminInputClassName, adminLabelClassName } from "@/features/admin/shared/utils";
import { formErrorTextClassName, formHelperTextClassName } from "@/lib/formStyles";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, login, isLoggingIn, loginError, clearLoginError, hasRole } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    const from = (location.state as { from?: string } | null)?.from;
    return from && from.startsWith("/admin") ? from : "/admin";
  }, [location.state]);

  if (!isLoading && user && hasRole(["admin", "staff", "moderator"])) {
    return <Navigate to={redirectTo} replace />;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearLoginError();
    setValidationError(null);

    const parsed = loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setValidationError(firstIssue?.message ?? "Please check your input.");
      return;
    }

    try {
      await login(parsed.data);
      navigate(redirectTo, { replace: true });
    } catch {
      // Error is stored in auth context as loginError.
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-secondary/25 p-6 md:p-8">
        <p className="font-display text-[11px] tracking-[0.25em] uppercase text-accent mb-3">Admin sign-in</p>
        <h1 className="font-display text-3xl text-foreground mb-2">Sign in</h1>
        <p className="text-sm text-foreground-secondary mb-6">Sign in with your administrator, staff, or moderator account.</p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label htmlFor="admin-email" className={adminLabelClassName}>Email</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (validationError) setValidationError(null);
                if (loginError) clearLoginError();
              }}
              className={adminInputClassName}
              placeholder="you@example.com"
            />
            <p className={formHelperTextClassName}>Use the email assigned to your account.</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="admin-password" className={adminLabelClassName}>Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (validationError) setValidationError(null);
                if (loginError) clearLoginError();
              }}
              className={adminInputClassName}
              placeholder="Enter your password"
            />
          </div>

          {(validationError || loginError) && <p className={formErrorTextClassName}>{validationError ?? loginError}</p>}

          <Button type="submit" variant="accent" size="default" className="w-full" disabled={isLoggingIn}>
            {isLoggingIn ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-5 text-sm text-foreground-secondary">
          <Link to="/" className="hover:text-foreground transition-colors">Return to website</Link>
        </div>
      </div>
    </div>
  );
}
