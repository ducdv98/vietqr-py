"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => obs.disconnect();
};
const isDark = () => document.documentElement.classList.contains("dark");

/** The initial class is set by THEME_INIT_SCRIPT before first paint (no flash). */
export function ThemeToggle() {
  const t = useTranslations("Shell");
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return (
    <button
      type="button"
      aria-label={t("toggleTheme")}
      aria-pressed={dark}
      onClick={() => {
        const next = !isDark();
        document.documentElement.classList.toggle("dark", next);
        try {
          localStorage.setItem("theme", next ? "dark" : "light");
        } catch {}
      }}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-input bg-card transition-colors hover:bg-muted"
    >
      {dark ? (
        <Sun aria-hidden className="size-4" />
      ) : (
        <Moon aria-hidden className="size-4" />
      )}
    </button>
  );
}
