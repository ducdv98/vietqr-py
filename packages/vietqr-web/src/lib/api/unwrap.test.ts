import { describe, expect, it } from "vitest";
import { ApiError, unwrap } from "./unwrap";

const headers = { "x-correlation-id": "abc123" };

function result(
  status: number,
  body: unknown,
  extra: Record<string, string> = headers,
) {
  const response = new Response(null, { status, headers: extra });
  return status >= 200 && status < 300
    ? { data: body, response }
    : { error: body, response };
}

async function failure(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    return e as ApiError;
  }
  throw new Error("expected unwrap to reject");
}

describe("unwrap", () => {
  it("returns the data of a success envelope", async () => {
    const out = await unwrap(
      Promise.resolve(
        result(200, { code: "00", desc: "success", data: { bin: "970415" } }),
      ),
    );
    expect(out).toEqual({ bin: "970415" });
  });

  it("returns a body that is not an envelope as is (health, images)", async () => {
    const out = await unwrap(
      Promise.resolve(result(200, { status: "ok", version: "0.1.0" })),
    );
    expect(out).toEqual({ status: "ok", version: "0.1.0" });
  });

  it("throws an ApiError with code, desc and correlation id for an error envelope", async () => {
    const err = await failure(
      unwrap(
        Promise.resolve(
          result(400, { code: "04", desc: "Bank not found.", data: null }),
        ),
      ),
    );
    expect(err).toMatchObject({
      code: "04",
      desc: "Bank not found.",
      correlationId: "abc123",
      status: 400,
    });
  });

  it("treats a non-00 code on a 200 as an error", async () => {
    const err = await failure(
      unwrap(
        Promise.resolve(result(200, { code: "06", desc: "No QR", data: null })),
      ),
    );
    expect(err.code).toBe("06");
  });

  it("maps a non-envelope failure (proxy 502, HTML) to code 99", async () => {
    const err = await failure(
      unwrap(Promise.resolve(result(502, "<html>Bad gateway</html>", {}))),
    );
    expect(err).toMatchObject({ code: "99", status: 502, correlationId: null });
    expect(err.desc).toContain("502");
  });

  it("maps a network failure to code 99", async () => {
    const err = await failure(
      unwrap(Promise.reject(new TypeError("fetch failed"))),
    );
    expect(err).toMatchObject({ code: "99", status: 0, correlationId: null });
  });
});
