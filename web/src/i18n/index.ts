import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import tr from "./locales/tr.json";

export const SUPPORTED_LANGUAGES = ["en", "tr"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Native names shown in the language switcher. */
export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: "English",
  tr: "Türkçe",
};

export const resources = {
  en: { translation: en },
  tr: { translation: tr },
} as const;

function isSupported(code: string | undefined | null): code is AppLanguage {
  return !!code && (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

/** First supported browser language, falling back to English. */
function detectBrowserLanguage(): AppLanguage {
  const best = (typeof navigator !== "undefined" ? navigator.language : "")
    .split("-")[0]
    ?.toLowerCase();
  return isSupported(best) ? best : "en";
}

// Resources are bundled, so init resolves synchronously. The saved override (if
// any) is applied from the settings store once it has hydrated (see App.tsx).
i18n.use(initReactI18next).init({
  resources,
  lng: detectBrowserLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** Switches the active language. Persist the choice via the settings store. */
export function changeLanguage(language: AppLanguage) {
  return i18n.changeLanguage(language);
}

export default i18n;
