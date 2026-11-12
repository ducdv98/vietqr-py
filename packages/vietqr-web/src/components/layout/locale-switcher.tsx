"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/i18n/actions";
import { LOCALE_NAMES } from "@/i18n/locales";
import { useConfig } from "@/lib/config";

export function LocaleSwitcher() {
  const t = useTranslations("Shell");
  const locale = useLocale();
  const { locales } = useConfig();
  const [pending, startTransition] = useTransition();
  if (locales.length < 2) return null;
  return (
    <select
      aria-label={t("language")}
      value={locale}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => setLocale(next));
      }}
      className="h-9 rounded-lg border border-input bg-card px-2 text-sm"
    >
      {locales.map((l) => (
        <option key={l} value={l} lang={l}>
          {LOCALE_NAMES[l]}
        </option>
      ))}
    </select>
  );
}
