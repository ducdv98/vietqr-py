import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const catalog = {
  code: "00",
  desc: "ok",
  data: [
    { code: "VCB", logo: "https://cdn.vietqr.io/img/VCB.png" },
    { code: "MB", logo: "" },
  ],
};

const fetchMock = vi.fn<typeof fetch>();

async function load() {
  vi.resetModules();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VIETQR_API_URL", "http://api:8000");
  return import("./route");
}

const call = async (code: string) => {
  const { GET } = await load();
  return GET(new Request("http://x/api/logos/" + code), {
    params: Promise.resolve({ code }),
  });
};

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.startsWith("http://api:8000")) return Response.json(catalog);
    return new Response(PNG, { headers: { "content-type": "image/png" } });
  });
});

describe("GET /api/logos/[code]", () => {
  it("serves the catalog logo same-origin with long cache headers", async () => {
    const res = await call("VCB");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toContain("max-age=86400");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://cdn.vietqr.io/img/VCB.png",
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("404s for unknown codes and banks without a logo, without fetching a logo", async () => {
    expect((await call("NOPE")).status).toBe(404);
    expect((await call("MB")).status).toBe(404);
    expect(
      fetchMock.mock.calls.every(([u]) => String(u).startsWith("http://api")),
    ).toBe(true);
  });

  it("502s when the upstream fails, is not an image, or redirects off-host", async () => {
    const cases: Array<() => Response> = [
      () => new Response("x", { status: 500 }),
      () =>
        new Response("<html>", { headers: { "content-type": "text/html" } }),
      () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://evil.io/x.png" },
        }),
      () =>
        new Response(new Uint8Array(600 * 1024), {
          headers: { "content-type": "image/png" },
        }),
    ];
    for (const make of cases) {
      fetchMock.mockImplementation(async (input) =>
        String(input).startsWith("http://api")
          ? Response.json(catalog)
          : make(),
      );
      expect((await call("VCB")).status).toBe(502);
    }
  });

  it("502s when the API is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("down"));
    expect((await call("VCB")).status).toBe(502);
  });

  it("caches the logo in memory", async () => {
    const { GET } = await load();
    const get = () =>
      GET(new Request("http://x"), {
        params: Promise.resolve({ code: "VCB" }),
      });
    await get();
    const calls = fetchMock.mock.calls.length;
    expect((await get()).status).toBe(200);
    expect(fetchMock.mock.calls.length).toBe(calls);
  });
});
