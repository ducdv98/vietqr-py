import { getConfig } from "@/lib/config/server";
import { resolveUpstream } from "@/lib/api/upstream";

// Same-origin proxy to vietqr-api (ADR 0002). Read at request time, so the API URL is runtime env.
export const dynamic = "force-dynamic";

/** Matches the API's decode time budget; a hung upstream becomes a 504 instead of hanging. */
const UPSTREAM_TIMEOUT_MS = 30_000;

const HOP_BY_HOP = [
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "te",
  "trailer",
  "proxy-authorization",
  "proxy-authenticate",
];

const errorResponse = (status: number, code: string, desc: string) =>
  Response.json({ code, desc, data: null }, { status });

async function proxy(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { apiUrl, maxUploadBytes } = getConfig();
  const { path } = await ctx.params;
  const target = resolveUpstream(apiUrl, path, new URL(req.url).search);
  if (!target) return errorResponse(404, "99", "Not found.");

  // Reject early on the declared size; the API enforces the same limit while streaming.
  const declared = req.headers.get("content-length");
  if (declared && Number(declared) > maxUploadBytes) {
    return errorResponse(
      413,
      "03",
      `The request body is over the limit of ${maxUploadBytes} bytes.`,
    );
  }

  const headers = new Headers(req.headers);
  for (const h of [...HOP_BY_HOP, "host", "cookie"]) headers.delete(h);
  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      // @ts-expect-error `duplex` is required by Node for streamed request bodies.
      duplex: "half",
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const out = new Headers(upstream.headers);
    // fetch already decoded the body, so the encoding/length headers no longer apply.
    for (const h of [...HOP_BY_HOP, "content-encoding", "content-length"]) {
      out.delete(h);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: out,
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    return timedOut
      ? errorResponse(504, "99", "The API took too long to respond.")
      : errorResponse(502, "99", "The API is unreachable.");
  }
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as HEAD,
};
