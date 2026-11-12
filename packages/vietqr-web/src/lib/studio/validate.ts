import type { components } from "@/lib/api/client";
import type { StudioParams } from "./params";

/** Mirrors packages/vietqr-api/src/vietqr_api/service.py. */
export const LIMITS = {
  maxAccountLength: 25,
  maxAmountDigits: 13,
  maxDescriptionLength: 95,
  minSize: 100,
  maxSize: 2000,
  defaultSize: 500,
} as const;

export type GenerateBody = components["schemas"]["GenerateRequest"];

export type FieldKey = "bank" | "account" | "amount" | "description" | "size";
export type FieldError = {
  code:
    | "required"
    | "unknownBank"
    | "notDigits"
    | "notPositive"
    | "tooLong"
    | "outOfRange";
  min?: number;
  max?: number;
};
export type FieldErrors = Partial<Record<FieldKey, FieldError>>;

export type Validation =
  { ok: true; request: GenerateBody } | { ok: false; errors: FieldErrors };

/**
 * Checks the form the way the API will (same limits), so most mistakes never cost a request.
 * `bankBin` is the BIN of the selected bank resolved from the catalog, or null if unresolved.
 */
export function validateStudio(
  params: StudioParams,
  bankBin: string | null,
): Validation {
  const errors: FieldErrors = {};
  const account = params.account.trim();
  const amount = params.amount.trim();
  const description = params.description.trim();
  const sizeText = params.size.trim();

  if (!params.bank.trim()) errors.bank = { code: "required" };
  else if (!bankBin) errors.bank = { code: "unknownBank" };

  if (!account) errors.account = { code: "required" };
  else if (account.length > LIMITS.maxAccountLength)
    errors.account = { code: "tooLong", max: LIMITS.maxAccountLength };

  if (!amount) errors.amount = { code: "required" };
  else if (!/^[0-9]+$/.test(amount)) errors.amount = { code: "notDigits" };
  else if (amount.length > LIMITS.maxAmountDigits)
    errors.amount = { code: "tooLong", max: LIMITS.maxAmountDigits };
  else if (/^0+$/.test(amount)) errors.amount = { code: "notPositive" };

  if (!description) errors.description = { code: "required" };
  else if (description.length > LIMITS.maxDescriptionLength)
    errors.description = {
      code: "tooLong",
      max: LIMITS.maxDescriptionLength,
    };

  let size: number = LIMITS.defaultSize;
  if (sizeText) {
    size = /^[0-9]+$/.test(sizeText) ? Number(sizeText) : NaN;
    if (!(size >= LIMITS.minSize && size <= LIMITS.maxSize))
      errors.size = {
        code: "outOfRange",
        min: LIMITS.minSize,
        max: LIMITS.maxSize,
      };
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const request: GenerateBody = {
    bankBin: bankBin!,
    accountNo: account,
    amount,
    description,
    template: params.template,
    serviceType: params.serviceType,
    format: "png",
    size,
  };
  const billNumber = params.billNumber.trim();
  const accountName = params.accountName.trim();
  if (billNumber) request.billNumber = billNumber;
  if (accountName) request.accountName = accountName;
  return { ok: true, request };
}

const QUERY_ORDER = [
  "bankBin",
  "accountNo",
  "amount",
  "description",
  "accountName",
  "template",
  "serviceType",
  "billNumber",
  "format",
  "size",
] as const;

/** Query string for GET /generate and GET /image. */
export function toQuery(request: GenerateBody): URLSearchParams {
  const sp = new URLSearchParams();
  for (const key of QUERY_ORDER) {
    const v = request[key];
    if (v !== undefined && v !== null && v !== "") sp.set(key, String(v));
  }
  return sp;
}
