import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "../types/api/auth";

type AuthStatus = "guest" | "authenticated";

interface AuthState {
  // --- persisted (localStorage) ---
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  // --- derived/session ---
  status: AuthStatus;

  /** Store a full session (tokens + user) after register/login. */
  login: (payload: {
    accessToken: string;
    refreshToken: string;
    user: User;
  }) => void;
  /** Replace tokens (e.g. after a refresh); keeps the user. */
  setTokens: (accessToken: string, refreshToken?: string | null) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      status: "guest",

      login: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user, status: "authenticated" }),
      setTokens: (accessToken, refreshToken) =>
        set((state) => ({
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
        })),
      setUser: (user) => set({ user }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          status: "guest",
        }),
    }),
    {
      name: "adeasier.auth",
      storage: createJSONStorage(() => localStorage),
      // Persist only the session; `status` is recomputed on rehydrate.
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) state.status = "authenticated";
      },
    },
  ),
);
