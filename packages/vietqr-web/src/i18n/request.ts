import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { getConfig } from "@/lib/config/server";
import { LOCALE_COOKIE } from "./locales";
import { resolveLocale } from "./resolve";

/**
 * Locale is resolved per request from cookie -> Accept-Language -> default, restricted to
 * the runtime-configured locales. There is no /vi or /en URL prefix: the set of locales is
 * runtime env (not known at build time), which URL-prefix routing and middleware matchers
 * would need baked in.
 */
export default getRequestConfig(async () => {
  const { locales, defaultLocale } = getConfig();
  const locale = resolveLocale({
    cookie: (await cookies()).get(LOCALE_COOKIE)?.value,
    acceptLanguage: (await headers()).get("accept-language"),
    locales,
    defaultLocale,
  });
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
