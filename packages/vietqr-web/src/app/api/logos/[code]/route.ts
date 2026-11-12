import { getConfig } from "@/lib/config/server";
import { createLogoService, type LogoService } from "@/lib/logos/service";

// Same-origin bank logos (ADR 0003). More specific than the /api/[...path] proxy, so it wins.
export const dynamic = "force-dynamic";

let service: LogoService | undefined;

function getService(): LogoService {
  if (!service) {
    const { apiUrl, logoHosts } = getConfig();
    service = createLogoService({ apiUrl, configuredHosts: logoHosts });
  }
  return service;
}

const text = (status: number, body: string) =>
  new Response(body, {
    status,
    headers: { "content-type": "text/plain", "cache-control": "no-store" },
  });

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await ctx.params;
  const result = await getService().getLogo(code);
  if (!result.ok) {
    return text(
      result.status,
      result.status === 404 ? "Not found" : "Bad gateway",
    );
  }
  return new Response(result.body, {
    headers: {
      "content-type": result.contentType,
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
      "cross-origin-resource-policy": "same-origin",
    },
  });
}
