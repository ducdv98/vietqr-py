import { z } from "zod";

export const LOCALES = ["vi", "en"] as const;
export const TEMPLATES = ["compact", "print", "qr_only"] as const;
export const PAGES = ["studio", "inspect", "banks", "pay"] as const;

export type Locale = (typeof LOCALES)[number];
export type Template = (typeof TEMPLATES)[number];
export type PageId = (typeof PAGES)[number];
export type FooterLink = { label: string; href: string };

export type AppConfig = {
  apiUrl: string;
  /** Largest request body the /api proxy accepts; keep equal to the API's VIETQR_MAX_UPLOAD_BYTES. */
  maxUploadBytes: number;
  /** Upstream hosts the same-origin logo route may fetch from; null derives them from the catalog. */
  logoHosts: string[] | null;
  appName: string;
  appLogo: string | null;
  locales: Locale[];
  defaultLocale: Locale;
  defaultTemplate: Template;
  enabledPages: PageId[];
  footerLinks: FooterLink[];
};

export class ConfigError extends Error {
  constructor(public readonly issues: string[]) {
    super(
      `Invalid vietqr-web configuration:\n${issues.map((i) => `  - ${i}`).join("\n")}\nSee .env.example for all settings.`,
    );
    this.name = "ConfigError";
  }
}

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());

const list = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .transform((s) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(values)).min(1, "must list at least one value"));

const hostList = z
  .string()
  .transform((s) =>
    s
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
  )
  .pipe(
    z
      .array(
        z
          .string()
          .regex(/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/, "must be bare hostnames"),
      )
      .min(1, "must list at least one host"),
  );

const footerLinks = z.string().transform((s, ctx) => {
  const links: FooterLink[] = [];
  for (const entry of s
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean)) {
    const i = entry.indexOf("|");
    const label = i > 0 ? entry.slice(0, i).trim() : "";
    const href = i > 0 ? entry.slice(i + 1).trim() : "";
    if (!label || !href) {
      ctx.addIssue({
        code: "custom",
        message: `"${entry}" must look like "Label|https://url"`,
      });
      return z.NEVER;
    }
    links.push({ label, href });
  }
  return links;
});

const envSchema = z.object({
  VIETQR_API_URL: z.preprocess(
    emptyToUndefined,
    z
      .url({ message: "must be an absolute URL, e.g. http://localhost:8000" })
      .transform((u) => u.replace(/\/+$/, "")),
  ),
  VIETQR_MAX_UPLOAD_BYTES: optional(z.coerce.number().int().positive()),
  VIETQR_LOGO_HOSTS: optional(hostList),
  VIETQR_APP_NAME: optional(z.string().trim().min(1)),
  VIETQR_APP_LOGO: optional(z.string().trim()),
  VIETQR_LOCALES: optional(list(LOCALES)),
  VIETQR_DEFAULT_LOCALE: optional(z.enum(LOCALES)),
  VIETQR_DEFAULT_TEMPLATE: optional(z.enum(TEMPLATES)),
  VIETQR_ENABLED_PAGES: optional(list(PAGES)),
  VIETQR_FOOTER_LINKS: optional(footerLinks),
});

/** Pure: validate raw env-like input into an AppConfig, or throw ConfigError. */
export function parseConfig(
  env: Record<string, string | undefined>,
): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new ConfigError(
      result.error.issues.map(
        (i) => `${String(i.path[0] ?? "config")}: ${i.message}`,
      ),
    );
  }
  const v = result.data;
  const locales = v.VIETQR_LOCALES ?? [...LOCALES];
  const defaultLocale = v.VIETQR_DEFAULT_LOCALE ?? locales[0]!;
  if (!locales.includes(defaultLocale)) {
    throw new ConfigError([
      `VIETQR_DEFAULT_LOCALE: "${defaultLocale}" must be one of VIETQR_LOCALES (${locales.join(", ")})`,
    ]);
  }
  return {
    apiUrl: v.VIETQR_API_URL,
    maxUploadBytes: v.VIETQR_MAX_UPLOAD_BYTES ?? 8 * 1024 * 1024,
    logoHosts: v.VIETQR_LOGO_HOSTS ?? null,
    appName: v.VIETQR_APP_NAME ?? "VietQR",
    appLogo: v.VIETQR_APP_LOGO || null,
    locales,
    defaultLocale,
    defaultTemplate: v.VIETQR_DEFAULT_TEMPLATE ?? "compact",
    enabledPages: v.VIETQR_ENABLED_PAGES ?? ["studio", "inspect", "banks"],
    footerLinks: v.VIETQR_FOOTER_LINKS ?? [],
  };
}
