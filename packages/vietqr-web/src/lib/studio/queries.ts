import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ApiError, api, unwrap } from "@/lib/api/client";
import type { GenerateBody } from "./validate";

/** What /generate returns for a valid request, plus the request that produced it. */
export type StudioPayload = {
  /** The EMVCo text string the QR encodes (CONTEXT.md: Payload). */
  qrCode: string;
  /** The Card image as a PNG data URL. */
  qrDataURL: string;
  /** The exact API request behind it; also what /image needs for the download. */
  request: GenerateBody;
};

/** Live preview via GET /generate. Disabled while `request` is null (form invalid). */
export function useStudioPayload(request: GenerateBody | null) {
  return useQuery({
    queryKey: ["generate", request],
    enabled: request !== null,
    placeholderData: keepPreviousData,
    // Validation errors are final; only retry transport failures.
    retry: (count, e) => e instanceof ApiError && e.status === 0 && count < 1,
    queryFn: async (): Promise<StudioPayload> => {
      const res = await unwrap(
        api.GET("/api/v1/vietqr-core/generate", {
          params: { query: request! },
        }),
      );
      return { ...res, request: request! };
    },
  });
}
