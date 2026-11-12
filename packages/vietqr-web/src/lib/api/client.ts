import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./schema";

export { GENERATED_API_VERSION } from "./version";
export { ApiError, unwrap } from "./unwrap";
export type { paths, components } from "./schema";

/** The API serves /health outside /api; the same-origin proxy exposes it as /api/health. */
const proxyHealth: Middleware = {
  onRequest({ request }) {
    const url = new URL(request.url);
    if (url.pathname !== "/health") return undefined;
    url.pathname = "/api/health";
    return new Request(url, request);
  },
};

/**
 * Typed client for the same-origin proxy (browser) or, with an absolute `baseUrl`, the API
 * itself (server only; pass `proxied: false`). Wrap calls in `unwrap()`:
 *
 *   const banks = await unwrap(api.GET("/api/v1/vietqr-core/banks"));
 */
export function createApiClient(
  options: { baseUrl?: string; proxied?: boolean } = {},
) {
  const client = createClient<paths>({ baseUrl: options.baseUrl ?? "" });
  if (options.proxied ?? true) client.use(proxyHealth);
  return client;
}

export const api = createApiClient();
