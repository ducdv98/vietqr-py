import { defaultParams, serializeParams } from "@/lib/studio/params";

type InspectedQr = {
  bankBin: string;
  bankInfo?: { code: string; bin: string } | null;
  accountNo: string;
  amount?: string | null;
  description?: string | null;
};

/** The single place that builds the "Create similar QR" link, using Studio's prefill contract. */
export function createSimilarHref(qr: InspectedQr): string {
  const query = serializeParams({
    ...defaultParams(),
    bank: qr.bankInfo?.code || qr.bankInfo?.bin || qr.bankBin,
    account: qr.accountNo,
    amount: qr.amount ?? "",
    description: qr.description ?? "",
  }).toString();
  return `/?${query}`;
}
