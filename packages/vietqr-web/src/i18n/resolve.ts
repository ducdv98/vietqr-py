import type { Locale } from "@/lib/config/parse";

/** Pure: pick the locale from cookie, then Accept-Language, then the default. */
export function resolveLocale(input: {
  cookie?: string | undefined;
  acceptLanguage?: string | null | undefined;
  locales: readonly Locale[];
  defaultLocale: Locale;
}): Locale {
  const { cookie, acceptLanguage, locales, defaultLocale } = input;
  const find = (tag: string) =>
    locales.find((l) => l === tag.trim().toLowerCase().split("-")[0]);
  if (cookie) {
    const hit = find(cookie);
    if (hit) return hit;
  }
  const tags = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag = "", q] = part.split(";q=");
      return { tag, q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    const hit = find(tag);
    if (hit) return hit;
  }
  return defaultLocale;
}
