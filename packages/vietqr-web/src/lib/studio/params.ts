/**
 * The ONE place that defines Studio's form fields and their query-string names.
 * Studio prefills from it; the Pay link and Pay page build and read the same
 * contract. Values are raw strings as typed; validation lives in ./validate.
 */

export const TEMPLATES = ["compact", "print", "qr_only"] as const;
export type Template = (typeof TEMPLATES)[number];

export const SERVICE_TYPES = ["account", "card"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export type StudioParams = {
  /** Bank short code or BIN (whatever GET /banks/{bin_or_code} accepts). */
  bank: string;
  account: string;
  /** VND, digits only as typed. */
  amount: string;
  description: string;
  template: Template;
  serviceType: ServiceType;
  billNumber: string;
  /** Pixels as typed; empty means the API default. */
  size: string;
  accountName: string;
};

/** Field name -> query-string key. */
export const PARAM_KEYS = {
  bank: "bank",
  account: "account",
  amount: "amount",
  description: "description",
  template: "template",
  serviceType: "service",
  billNumber: "bill",
  size: "size",
  accountName: "name",
} as const satisfies Record<keyof StudioParams, string>;

/** Form fields that can carry a validation error (Studio touches them; Pay lists them). */
export const FORM_FIELD_KEYS = [
  "bank",
  "account",
  "amount",
  "description",
  "size",
] as const satisfies readonly (keyof StudioParams)[];

export const DEFAULT_TEMPLATE: Template = "compact";

export function defaultParams(
  template: Template = DEFAULT_TEMPLATE,
): StudioParams {
  return {
    bank: "",
    account: "",
    amount: "",
    description: "",
    template,
    serviceType: "account",
    billNumber: "",
    size: "",
    accountName: "",
  };
}

type ParamsInput =
  string | URLSearchParams | Record<string, string | string[] | undefined>;

function toSearchParams(input: ParamsInput): URLSearchParams {
  if (typeof input === "string") return new URLSearchParams(input);
  if (input instanceof URLSearchParams) return input;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(input)) {
    const first = Array.isArray(v) ? v[0] : v;
    if (first !== undefined) sp.set(k, first);
  }
  return sp;
}

/**
 * Reads Studio params from a query string, URLSearchParams or a Next.js `searchParams`
 * record. Unknown keys are ignored; an invalid template falls back to `defaults.template`,
 * an unknown service type to "account".
 */
export function parseParams(
  input: ParamsInput,
  defaults: StudioParams = defaultParams(),
): StudioParams {
  const sp = toSearchParams(input);
  const get = (key: keyof StudioParams) => sp.get(PARAM_KEYS[key]) ?? "";
  const template = get("template").trim().toLowerCase();
  const service = get("serviceType").trim().toLowerCase();
  return {
    bank: get("bank"),
    account: get("account"),
    amount: get("amount"),
    description: get("description"),
    template: (TEMPLATES as readonly string[]).includes(template)
      ? (template as Template)
      : defaults.template,
    serviceType: service === "card" ? "card" : "account",
    billNumber: get("billNumber"),
    size: get("size"),
    accountName: get("accountName"),
  };
}

/** Query string for the params; empty values and values equal to `defaults` are omitted. */
export function serializeParams(
  params: StudioParams,
  defaults: StudioParams = defaultParams(),
): URLSearchParams {
  const sp = new URLSearchParams();
  for (const key of Object.keys(PARAM_KEYS) as (keyof StudioParams)[]) {
    const value = params[key];
    if (value === "" || value === defaults[key]) continue;
    sp.set(PARAM_KEYS[key], value);
  }
  return sp;
}
