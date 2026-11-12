import type { StudioParams } from "@/lib/studio/params";
import {
  validateStudio,
  type FieldErrors,
  type GenerateBody,
} from "@/lib/studio/validate";

type CatalogBank = { bin: string; code: string; shortName: string };

export type PayResolution<B extends CatalogBank = CatalogBank> =
  | { status: "missing" }
  | { status: "invalid"; errors: FieldErrors }
  | { status: "ok"; request: GenerateBody; bank: B };

/**
 * Turns a Pay link's params into what the Pay page needs: the /generate request (always the
 * QR-only Template, since the page shows bank, account and amount itself) and the resolved bank.
 */
export function resolvePay<B extends CatalogBank>(
  params: StudioParams,
  banks: readonly B[],
): PayResolution<B> {
  if (!params.bank.trim() && !params.account.trim() && !params.amount.trim())
    return { status: "missing" };
  const v = params.bank.trim().toLowerCase();
  const bank = banks.find((b) => b.bin === v || b.code.toLowerCase() === v);
  const result = validateStudio(
    { ...params, template: "qr_only" },
    bank?.bin ?? null,
  );
  if (!result.ok) return { status: "invalid", errors: result.errors };
  return { status: "ok", request: result.request, bank: bank! };
}
