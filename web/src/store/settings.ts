import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppLanguage } from "../i18n";

interface SettingsState {
  /** null = follow the browser language; otherwise an explicit override. */
  language: AppLanguage | null;
  setLanguage: (language: AppLanguage) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: null,
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "adeasier.settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
