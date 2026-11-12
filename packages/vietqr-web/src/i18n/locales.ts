import type { Locale } from "@/lib/config/parse";

/** Native names, shown in the switcher regardless of the active locale. */
export const LOCALE_NAMES: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
};

export const LOCALE_COOKIE = "NEXT_LOCALE";
