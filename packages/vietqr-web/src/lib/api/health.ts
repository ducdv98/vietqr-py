import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "./client";

export const HEALTH_POLL_MS = 30_000;

export const healthQueryKey = ["health"] as const;

/** Polls GET /health. Resolves `{ version }` (null if the API omits it); rejects when unreachable. */
export function useHealth(intervalMs: number = HEALTH_POLL_MS) {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: async () => {
      const body: { version?: string } = await unwrap(api.GET("/health"));
      return { version: body.version ?? null };
    },
    refetchInterval: intervalMs,
    retry: false,
  });
}
