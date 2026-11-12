/** Pure helpers that decide which upstream logo URLs the same-origin logo route may fetch. */

export type CatalogBank = { code: string; logo: string };

/** The catalog's logo URL for a bank code (exact match), or null when unknown or empty. */
export function findLogoUrl(
  banks: readonly CatalogBank[],
  code: string,
): string | null {
  const bank = banks.find((b) => b.code === code);
  return bank?.logo ? bank.logo : null;
}

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** Hostnames that are never fetched: localhost, IP literals and single-label names. */
function isInternalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    host.includes(":") ||
    IPV4.test(host) ||
    !host.includes(".")
  );
}

/** Parses an https URL with a public-looking hostname, or null. */
export function parseLogoUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (isInternalHost(host)) return null;
  return url;
}

/**
 * The upstream hosts logos may come from: the configured list when set, otherwise the https
 * hosts that appear in the catalog's own logo URLs.
 */
export function allowedHosts(
  banks: readonly CatalogBank[],
  configured: readonly string[] | null,
): Set<string> {
  if (configured && configured.length > 0) {
    return new Set(configured.map((h) => h.toLowerCase()));
  }
  const hosts = new Set<string>();
  for (const b of banks) {
    const url = b.logo ? parseLogoUrl(b.logo) : null;
    if (url) hosts.add(url.hostname.toLowerCase());
  }
  return hosts;
}

/** True when the URL is https, public-looking and its host is in the allowlist. */
export function isAllowedLogoUrl(
  raw: string,
  hosts: ReadonlySet<string>,
): boolean {
  const url = parseLogoUrl(raw);
  return url !== null && hosts.has(url.hostname.toLowerCase());
}
