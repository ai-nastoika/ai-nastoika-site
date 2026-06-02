import { useCallback } from "react";
import { trpc } from "@/providers/trpc";

export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  role: string;
};

export function useAuth() {
  const utils = trpc.useUtils();
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(() => {
    localStorage.removeItem("auth-token");
    utils.auth.me.invalidate();
    window.location.reload();
  }, [utils]);

  return {
    user: user as AuthUser | undefined,
    isLoading,
    isLoggedIn: !!user,
    isAdmin: user?.role === "admin",
    logout,
  };
}
