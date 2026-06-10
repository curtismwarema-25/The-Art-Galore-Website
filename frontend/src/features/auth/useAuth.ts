import { useContext } from "react";
import { AuthContext } from "@/features/auth/authContextCore";

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
