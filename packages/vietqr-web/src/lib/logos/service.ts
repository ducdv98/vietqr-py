import {
  allowedHosts,
  findLogoUrl,
  isAllowedLogoUrl,
  type CatalogBank,
} from "./resolve";

export const MAX_LOGO_BYTES = 512 * 1024;
const FETCH_TIMEOUT_MS = 5_000;
const MAX_REDIRECTS = 2;
const CATALOG_TTL_MS = 10 * 60_000;
const LOGO_TTL_MS = 24 * 60 * 60_000;
const MAX_CACHED_LOGOS = 200;

export type LogoResult =
  | { ok: true; body: Uint8Array<ArrayBuffer>; contentType: string }
  | { ok: false; status: 404 | 502 };

export type LogoServiceOptions = {
  /** Base URL of vietqr-api. */
  apiUrl: string;
  /** VIETQR_LOGO_HOSTS; null derives the allowlist from the catalog. */
  configuredHosts: readonly string[] | null;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

const NOT_FOUND = { ok: false, status: 404 } as const;
const BAD_GATEWAY = { ok: false, status: 502 } as const;

/** Reads at most `max` bytes; null when the body is larger. */
async function readCapped(
  res: Response,
  max: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const declared = Number(res.headers.get("content-length"));
  if (declared > max) return null;
  if (!res.body) return new Uint8Array(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/**
 * Serves bank logos on behalf of the browser so it never contacts the logo host. The URL is
 * always taken from the API catalog by bank code, never from the client.
 */
export function createLogoService(options: LogoServiceOptions) {
  const doFetch = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  let catalog: { banks: CatalogBank[]; at: number } | null = null;
  const logos = new Map<
    string,
    { body: Uint8Array<ArrayBuffer>; contentType: string; at: number }
  >();

  async function loadCatalog(): Promise<CatalogBank[] | null> {
    if (catalog && now() - catalog.at < CATALOG_TTL_MS) return catalog.banks;
    try {
      const res = await doFetch(`${options.apiUrl}/api/v1/vietqr-core/banks`, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) return catalog?.banks ?? null;
      const body = (await res.json()) as { code?: string; data?: unknown };
      if (body.code !== "00" || !Array.isArray(body.data)) return null;
      const banks = body.data
        .filter(
          (b): b is CatalogBank =>
            typeof b?.code === "string" && typeof b?.logo === "string",
        )
        .map((b) => ({ code: b.code, logo: b.logo }));
      catalog = { banks, at: now() };
      return banks;
    } catch {
      return catalog?.banks ?? null;
    }
  }

  /** Fetches one logo, following only https redirects that stay on the same allowed host. */
  async function fetchLogo(
    start: string,
    hosts: ReadonlySet<string>,
  ): Promise<LogoResult> {
    let url = start;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isAllowedLogoUrl(url, hosts)) return BAD_GATEWAY;
      const res = await doFetch(url, {
        redirect: "manual",
        credentials: "omit",
        headers: { accept: "image/*" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return BAD_GATEWAY;
        const next = new URL(location, url);
        if (next.hostname !== new URL(url).hostname) return BAD_GATEWAY;
        url = next.href;
        continue;
      }
      if (!res.ok) return BAD_GATEWAY;
      const contentType = (res.headers.get("content-type") ?? "")
        .split(";")[0]!
        .trim()
        .toLowerCase();
      if (!contentType.startsWith("image/")) return BAD_GATEWAY;
      const body = await readCapped(res, MAX_LOGO_BYTES);
      if (!body || body.byteLength === 0) return BAD_GATEWAY;
      return { ok: true, body, contentType };
    }
    return BAD_GATEWAY;
  }

  return {
    async getLogo(code: string): Promise<LogoResult> {
      const hit = logos.get(code);
      if (hit && now() - hit.at < LOGO_TTL_MS) {
        return { ok: true, body: hit.body, contentType: hit.contentType };
      }
      const banks = await loadCatalog();
      if (!banks) return BAD_GATEWAY;
      const logoUrl = findLogoUrl(banks, code);
      if (!logoUrl) return NOT_FOUND;
      try {
        const result = await fetchLogo(
          logoUrl,
          allowedHosts(banks, options.configuredHosts),
        );
        if (result.ok) {
          if (logos.size >= MAX_CACHED_LOGOS) {
            logos.delete(logos.keys().next().value!);
          }
          logos.set(code, { ...result, at: now() });
        }
        return result;
      } catch {
        return BAD_GATEWAY;
      }
    },
  };
}

export type LogoService = ReturnType<typeof createLogoService>;
