"use client";

import { useTranslations } from "next-intl";
import { CircleAlert } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { ApiErrorAlert } from "@/components/api-error";
import { BankPicker } from "@/components/banks/bank-picker";
import { findBank } from "@/lib/banks/find";
import { useBanks } from "@/lib/banks/queries";
import {
  FORM_FIELD_KEYS,
  SERVICE_TYPES,
  type StudioParams,
  type Template,
} from "@/lib/studio/params";
import { useStudioPayload } from "@/lib/studio/queries";
import { Accordion } from "@/components/ui/accordion";
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
  "h-10 w-full rounded-md border border-input bg-card px-3 text-[0.9375rem] transition-colors hover:border-muted-foreground focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-ring aria-[invalid=true]:border-destructive";
/** Account numbers and amounts are data: mono, tabular. */
const dataInputClass = `${inputClass} font-mono text-sm tracking-[0.02em] tabular-nums`;

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
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[0.8125rem] leading-4 font-medium text-muted-foreground"
      >
        {label}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": !!error,
      })}
      {hint ? (
        <p
          id={`${id}-hint`}
          className="text-[0.8125rem] leading-5 text-subtle-foreground"
        >
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-start gap-1.5 text-[0.8125rem] leading-5 text-destructive"
        >
          <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
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
    params: StudioParams;
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

  // The Template is the one change that re-renders without Generate, so it is not "outdated".
  const snapshot = JSON.stringify({ ...effective, template: undefined });
  const outdated = generated !== null && generated.snapshot !== snapshot;
  const preview = useStudioPayload(generated?.request ?? null);
  const showAll = () => setTouched(new Set<FieldKey>(FORM_FIELD_KEYS));

  const resultRef = useRef<HTMLElement>(null);
  const [scrollTick, setScrollTick] = useState(0);
  // On narrow screens the result sits below the form: bring it into view after Generate.
  useEffect(() => {
    if (scrollTick === 0) return;
    if (window.matchMedia?.("(min-width: 64rem)").matches) return;
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollTick]);

  function onGenerate() {
    if (!request) return showAll();
    setGenerated({ request, snapshot, params: effective });
    setScrollTick((n) => n + 1);
  }

  function onTemplateChange(template: Template) {
    set("template", template);
    setGenerated((g) =>
      g ? { ...g, request: { ...g.request, template } } : g,
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-[56ch] text-muted-foreground">{t("intro")}</p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <form
          aria-label={t("formLabel")}
          className="space-y-5 rounded-lg border border-border bg-card p-4 text-card-foreground sm:p-5"
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
          <p className="text-[0.8125rem] leading-5 text-subtle-foreground">
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
                className={dataInputClass}
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
                  className={dataInputClass}
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

          <Accordion summary={t("advanced")}>
            <div className="space-y-4 pt-2">
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
                    className={dataInputClass}
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
                    className={dataInputClass}
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
          </Accordion>

          <div className="space-y-2">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!valid}
              aria-describedby={valid ? undefined : hintId}
            >
              {t("generate")}
            </Button>
            {!valid ? (
              <p
                id={hintId}
                className="text-[0.8125rem] leading-5 text-subtle-foreground"
              >
                {t("generateHint", { fields: missing.join(", ") })}
              </p>
            ) : null}
          </div>
        </form>

        <StudioPreview
          payload={preview.data ?? null}
          params={
            generated
              ? { ...generated.params, template: effective.template }
              : effective
          }
          error={generated ? preview.error : null}
          pending={generated !== null && preview.isFetching}
          outdated={outdated}
          onTemplateChange={onTemplateChange}
          sectionRef={resultRef}
        />
      </div>
    </div>
  );
}
