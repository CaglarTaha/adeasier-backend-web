import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useUiStore } from "../store/ui";
import type { Role } from "../types/api/auth";

/** Route gate: requires a session, else opens the login modal and bounces home. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const authed = useAuthStore((s) => s.status === "authenticated");
  const openLoginModal = useUiStore((s) => s.openLoginModal);

  useEffect(() => {
    if (!authed) openLoginModal();
  }, [authed, openLoginModal]);

  if (!authed) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Route gate: requires a session AND a specific role (e.g. creator-only). */
export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const authed = useAuthStore((s) => s.status === "authenticated");
  const userRole = useAuthStore((s) => s.user?.role);
  const openLoginModal = useUiStore((s) => s.openLoginModal);

  useEffect(() => {
    if (!authed) openLoginModal();
  }, [authed, openLoginModal]);

  if (!authed) return <Navigate to="/" replace />;
  if (userRole !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}
