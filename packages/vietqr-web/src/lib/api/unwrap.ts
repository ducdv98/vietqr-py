/** Error codes of the API's {code, desc, data} envelope; "99" also covers transport failures. */
export type ApiErrorCode =
  "01" | "02" | "03" | "04" | "05" | "06" | "07" | "99" | (string & {});

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly desc: string,
    public readonly correlationId: string | null,
    /** HTTP status; 0 when no response was received. */
    public readonly status: number,
  ) {
    super(`[${code}] ${desc}`);
    this.name = "ApiError";
  }
}

/** The shape openapi-fetch resolves with. */
export type FetchResult<T> = {
  data?: T;
  error?: unknown;
  response: Response;
};

type Envelope = { code: string; desc: string; data?: unknown };

const isEnvelope = (v: unknown): v is Envelope =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as Envelope).code === "string" &&
  typeof (v as Envelope).desc === "string";

/** Unwraps an envelope's `data`; other success bodies (health, images) pass through. */
export type Unwrapped<T> = T extends { data?: infer D } ? NonNullable<D> : T;

/**
 * Resolves an openapi-fetch call to its payload, or rejects with an ApiError.
 * Never resolves with an error body, and never rejects with anything else.
 */
export async function unwrap<T>(
  call: Promise<FetchResult<T>>,
): Promise<Unwrapped<T>> {
  let result: FetchResult<T>;
  try {
    result = await call;
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    throw new ApiError("99", `Network error: ${reason}`, null, 0);
  }
  const { response } = result;
  const correlationId = response.headers.get("x-correlation-id");
  const body = result.error !== undefined ? result.error : result.data;

  if (isEnvelope(body)) {
    if (response.ok && body.code === "00") return body.data as Unwrapped<T>;
    throw new ApiError(body.code, body.desc, correlationId, response.status);
  }
  if (!response.ok) {
    throw new ApiError(
      "99",
      `Unexpected response: HTTP ${response.status}`,
      correlationId,
      response.status,
    );
  }
  return body as Unwrapped<T>;
}
