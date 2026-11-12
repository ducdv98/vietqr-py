import { PARAM_KEYS } from "@/lib/studio/params";

/**
 * Studio prefill contract (consumed by the Studio page): `/?bank=<code or BIN>`.
 * The value is whatever GET /banks/{bin_or_code} accepts; we emit the short code (e.g. VCB),
 * or the BIN when a bank has no code.
 */
export const STUDIO_BANK_PARAM = PARAM_KEYS.bank;

export function studioHref(bank: { code: string; bin: string }): string {
  const params = new URLSearchParams({
    [STUDIO_BANK_PARAM]: bank.code || bank.bin,
  });
  return `/?${params.toString()}`;
}
