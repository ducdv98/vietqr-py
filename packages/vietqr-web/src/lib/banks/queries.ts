import { useQuery } from "@tanstack/react-query";
import { api, unwrap, type components } from "@/lib/api/client";

export type Bank = components["schemas"]["BankModel"];

export const banksQueryKey = ["banks"] as const;
export const bankQueryKey = (binOrCode: string) =>
  ["banks", binOrCode] as const;

/** The full catalog (~80 banks); cached for the session, filtered client-side. */
export function useBanks() {
  return useQuery({
    queryKey: banksQueryKey,
    queryFn: () => unwrap(api.GET("/api/v1/vietqr-core/banks")),
    staleTime: Infinity,
  });
}

export function useBank(binOrCode: string) {
  return useQuery({
    queryKey: bankQueryKey(binOrCode),
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/vietqr-core/banks/{bin_or_code}", {
          params: { path: { bin_or_code: binOrCode } },
        }),
      ),
    retry: false,
  });
}
