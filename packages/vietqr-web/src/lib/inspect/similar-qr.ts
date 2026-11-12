import {
  SERVICE_TYPES,
  defaultParams,
  serializeParams,
  type ServiceType,
  type Template,
} from "@/lib/studio/params";
import type { Bank } from "@/lib/banks/queries";

type InspectedQr = {
  bankBin: string;
  bankInfo?: Pick<Bank, "code" | "bin"> | null;
  accountNo: string;
  amount?: string | null;
  description?: string | null;
  serviceType?: string | null;
  billNumber?: string | null;
};

const isServiceType = (v: string | null | undefined): v is ServiceType =>
  (SERVICE_TYPES as readonly (string | null | undefined)[]).includes(v);

/**
 * The single place that builds the "Create similar QR" link, using Studio's prefill contract.
 * `defaultTemplate` is the configured default, so the link leaves the Template to Studio.
 */
export function createSimilarHref(
  qr: InspectedQr,
  defaultTemplate?: Template,
): string {
  const defaults = defaultParams(defaultTemplate);
  const query = serializeParams(
    {
      ...defaults,
      bank: qr.bankInfo?.code || qr.bankInfo?.bin || qr.bankBin,
      account: qr.accountNo,
      amount: qr.amount ?? "",
      description: qr.description ?? "",
      serviceType: isServiceType(qr.serviceType) ? qr.serviceType : "account",
      billNumber: qr.billNumber ?? "",
    },
    defaults,
  ).toString();
  return `/?${query}`;
}
