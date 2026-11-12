/**
 * Maps a browser path under /api/ (as segments) to the API URL, or null when it must not be
 * proxied. Only /health and the versioned API are exposed, never /docs or /openapi.json.
 */
export function resolveUpstream(
  apiUrl: string,
  segments: string[],
  search: string,
): string | null {
  if (segments.some((s) => s === "" || s === "." || s === "..")) return null;
  if (segments.length === 1 && segments[0] === "health") {
    return `${apiUrl}/health${search}`;
  }
  if (segments[0] === "v1" && segments[1] === "vietqr-core") {
    return `${apiUrl}/api/${segments.join("/")}${search}`;
  }
  return null;
}
