"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { ApiErrorAlert } from "@/components/api-error";
import { BankPicker } from "@/components/banks/bank-picker";
import { findBank } from "@/lib/banks/find";
import { useBanks } from "@/lib/banks/queries";
import {
  FORM_FIELD_KEYS,
  SERVICE_TYPES,
  TEMPLATES,
  type StudioParams,
} from "@/lib/studio/params";
import { useStudioPayload } from "@/lib/studio/queries";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import {
  validateStudio,
  type FieldError,
  type FieldErrors,
  type FieldKey,
  type GenerateBody,
} from "@/lib/studio/validate";
import { StudioPreview } from "./studio-preview";

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-600";

type QrType = "static" | "dynamic";

/** Display order for the "what is missing" hint. */
const HINT_ORDER: readonly FieldKey[] = [
  "bank",
  "account",
  "amount",
  "description",
  "size",
];

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: (a: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean;
  }) => React.ReactNode;
}) {
  const id = useId();
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": !!error,
      })}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          className="text-xs text-red-700 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Studio: the merchant-facing flow. `initial` comes from the query string (see lib/studio/params). */
export function Studio({ initial }: { initial: StudioParams }) {
  const t = useTranslations("Studio");
  const [params, setParams] = useState(initial);
  const [touched, setTouched] = useState<ReadonlySet<FieldKey>>(new Set());
  const [qrType, setQrType] = useState<QrType>(
    initial.amount ? "dynamic" : "static",
  );
  // What the last Generate click asked for; nothing is requested before the first click.
  const [generated, setGenerated] = useState<{
    request: GenerateBody;
    snapshot: string;
  } | null>(null);
  const banks = useBanks();
  const hintId = useId();

  const set = <K extends keyof StudioParams>(k: K, v: StudioParams[K]) =>
    setParams((p) => ({ ...p, [k]: v }));
  const touch = (k: FieldKey) => setTouched((s) => new Set(s).add(k));

  // A static QR never carries the amount; it stays in `params` so switching back restores it.
  const effective: StudioParams =
    qrType === "static" ? { ...params, amount: "" } : params;
  const bin = findBank(banks.data ?? [], params.bank)?.bin ?? null;
  const validation = validateStudio(effective, bin);
  const errors: FieldErrors = validation.ok ? {} : { ...validation.errors };
  if (qrType === "dynamic" && !effective.amount.trim() && !errors.amount)
    errors.amount = { code: "required" };
  const valid = Object.keys(errors).length === 0;
  const request = validation.ok && valid ? validation.request : null;

  // Field errors are shown for touched fields; the catalog must be loaded to judge the bank.
  const errorText = (key: FieldKey): string | undefined => {
    if (!touched.has(key)) return undefined;
    if (key === "bank" && !banks.data) return undefined;
    const e: FieldError | undefined = errors[key];
    return e
      ? t(`errors.${e.code}`, { min: e.min ?? 0, max: e.max ?? 0 })
      : undefined;
  };
  const missing = HINT_ORDER.filter((k) => errors[k]).map((k) =>
    t(`fields.${k}`),
  );

  const snapshot = JSON.stringify(effective);
  const outdated = generated !== null && generated.snapshot !== snapshot;
  const preview = useStudioPayload(generated?.request ?? null);
  const showAll = () => setTouched(new Set<FieldKey>(FORM_FIELD_KEYS));

  function onGenerate() {
    if (!request) return showAll();
    setGenerated({ request, snapshot });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </header>
      <div className="grid gap-8 lg:grid-cols-2">
        <form
          aria-label={t("formLabel")}
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onGenerate();
          }}
        >
          <Segmented
            name="qrType"
            aria-label={t("type.label")}
            value={qrType}
            onValueChange={setQrType}
            options={[
              { value: "static", label: t("type.static") },
              { value: "dynamic", label: t("type.dynamic") },
            ]}
          />
          <p className="text-xs text-muted-foreground">
            {t(`type.note.${qrType}`)}
          </p>
          {banks.error ? <ApiErrorAlert error={banks.error} /> : null}
          <Field label={t("fields.bank")} error={errorText("bank")}>
            {(a) => (
              <BankPicker
                {...a}
                banks={banks.data ?? []}
                loading={banks.isPending}
                value={params.bank}
                onChange={(b) => {
                  set("bank", b ? b.code || b.bin : "");
                  touch("bank");
                }}
              />
            )}
          </Field>
          <Field label={t("fields.account")} error={errorText("account")}>
            {(a) => (
              <input
                {...a}
                className={inputClass}
                autoComplete="off"
                inputMode="numeric"
                value={params.account}
                onChange={(e) => set("account", e.target.value)}
                onBlur={() => touch("account")}
              />
            )}
          </Field>
          {qrType === "dynamic" ? (
            <Field
              label={t("fields.amount")}
              hint={t("hints.amount")}
              error={errorText("amount")}
            >
              {(a) => (
                <input
                  {...a}
                  className={inputClass}
                  autoComplete="off"
                  inputMode="numeric"
                  value={params.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  onBlur={() => touch("amount")}
                />
              )}
            </Field>
          ) : null}
          <Field
            label={t("fields.description")}
            hint={t("hints.description")}
            error={errorText("description")}
          >
            {(a) => (
              <input
                {...a}
                className={inputClass}
                autoComplete="off"
                value={params.description}
                onChange={(e) => set("description", e.target.value)}
                onBlur={() => touch("description")}
              />
            )}
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {t("fields.template")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((tpl) => (
                <label
                  key={tpl}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm has-[:checked]:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                >
                  <input
                    type="radio"
                    name="template"
                    value={tpl}
                    checked={params.template === tpl}
                    onChange={() => set("template", tpl)}
                  />
                  {t(`templates.${tpl}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <details className="rounded-md border border-input p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {t("advanced")}
            </summary>
            <div className="mt-3 space-y-4">
              <Field label={t("fields.serviceType")}>
                {(a) => (
                  <select
                    {...a}
                    className={inputClass}
                    value={params.serviceType}
                    onChange={(e) =>
                      set(
                        "serviceType",
                        e.target.value as StudioParams["serviceType"],
                      )
                    }
                  >
                    {SERVICE_TYPES.map((s) => (
                      <option key={s} value={s}>
                        {t(`serviceTypes.${s}`)}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label={t("fields.billNumber")}>
                {(a) => (
                  <input
                    {...a}
                    className={inputClass}
                    autoComplete="off"
                    value={params.billNumber}
                    onChange={(e) => set("billNumber", e.target.value)}
                  />
                )}
              </Field>
              <Field
                label={t("fields.size")}
                hint={t("hints.size")}
                error={errorText("size")}
              >
                {(a) => (
                  <input
                    {...a}
                    className={inputClass}
                    inputMode="numeric"
                    placeholder="500"
                    value={params.size}
                    onChange={(e) => set("size", e.target.value)}
                    onBlur={() => touch("size")}
                  />
                )}
              </Field>
              <Field label={t("fields.accountName")}>
                {(a) => (
                  <input
                    {...a}
                    className={inputClass}
                    autoComplete="off"
                    value={params.accountName}
                    onChange={(e) => set("accountName", e.target.value)}
                  />
                )}
              </Field>
            </div>
          </details>

          <div className="space-y-2">
            <Button
              type="submit"
              disabled={!valid}
              aria-describedby={valid ? undefined : hintId}
            >
              {t("generate")}
            </Button>
            {!valid ? (
              <p id={hintId} className="text-xs text-muted-foreground">
                {t("generateHint", { fields: missing.join(", ") })}
              </p>
            ) : null}
          </div>
        </form>

        <StudioPreview
          payload={preview.data ?? null}
          params={effective}
          error={generated ? preview.error : null}
          pending={generated !== null && preview.isFetching}
          outdated={outdated}
        />
      </div>
    </div>
  );
}
