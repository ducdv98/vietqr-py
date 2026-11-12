"use server";

import { cookies } from "next/headers";
import { getConfig } from "@/lib/config/server";
import { LOCALE_COOKIE } from "./locales";

/** Persist the chosen locale in a cookie (ignored unless it is an enabled locale). */
export async function setLocale(locale: string): Promise<void> {
  if (!getConfig().locales.some((l) => l === locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
