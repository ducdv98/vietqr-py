"use client";

import { useLocale, useTranslations } from "next-intl";
import { ApiErrorAlert } from "@/components/api-error";
import { BankLogo } from "@/components/banks/bank-logo";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatVnd } from "@/lib/format/amount";
import { useBanks } from "@/lib/banks/queries";
import { resolvePay } from "@/lib/pay/resolve";
import { FORM_FIELD_KEYS, type StudioParams } from "@/lib/studio/params";
import { useStudioPayload } from "@/lib/studio/queries";

function ProblemAlert({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className="space-y-2 rounded-xl border border-red-500/50 bg-red-500/10 p-4"
    >
      <p className="font-medium">{title}</p>
      {children}
    </div>
  );
}

/** Payer-facing view of a Pay link: QR, bank, account number and amount, plus a verify notice. */
export function PayView({ params }: { params: StudioParams }) {
  const t = useTranslations("Pay");
  const locale = useLocale();
  const tStudio = useTranslations("Studio");
  const banks = useBanks();
  const resolved = banks.data ? resolvePay(params, banks.data) : null;
  const request = resolved?.status === "ok" ? resolved.request : null;
  const qr = useStudioPayload(request);

  if (banks.error) return <ApiErrorAlert error={banks.error} />;
  if (!resolved)
    return (
      <div className="mx-auto max-w-md space-y-3">
        <p role="status" className="text-muted-foreground">
          {t("loading")}
        </p>
        <Skeleton className="h-64" />
      </div>
    );
  if (resolved.status === "missing")
    return (
      <ProblemAlert title={t("errors.missingTitle")}>
        <p className="text-sm">{t("errors.missing")}</p>
      </ProblemAlert>
    );
  if (resolved.status === "invalid")
    return (
      <ProblemAlert title={t("errors.invalidTitle")}>
        <p className="text-sm">{t("errors.invalid")}</p>
        <ul className="list-disc pl-5 text-sm">
          {FORM_FIELD_KEYS.flatMap((k) => {
            const e = resolved.errors[k];
            return e
              ? [
                  <li key={k}>
                    {tStudio(`fields.${k}`)}:{" "}
                    {tStudio(`errors.${e.code}`, {
                      min: e.min ?? 0,
                      max: e.max ?? 0,
                    })}
                  </li>,
                ]
              : [];
          })}
        </ul>
      </ProblemAlert>
    );

  const { bank, request: req } = resolved;
  const amount = req.amount ? formatVnd(req.amount, locale) : null;
  return (
    <Card className="mx-auto max-w-md p-5">
      <article className="space-y-5" aria-labelledby="pay-title">
        <h1 id="pay-title" className="text-2xl font-semibold">
          {t("title")}
        </h1>
        <div
          role="note"
          className="rounded-lg bg-warning p-3 text-sm text-warning-foreground"
        >
          <p className="font-medium">{t("verify.title")}</p>
          <p>{t("verify.body")}</p>
        </div>
        {qr.error ? <ApiErrorAlert error={qr.error} /> : null}
        {!qr.error && qr.data ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qr.data.qrDataURL}
            alt={t("qrAlt")}
            className="mx-auto w-full max-w-xs rounded-md border border-input bg-white"
          />
        ) : null}
        {!qr.error && !qr.data ? (
          <p role="status" className="text-muted-foreground">
            {t("generating")}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <BankLogo logo={bank.logo} code={bank.code} className="size-12" />
          <p className="text-lg font-semibold" data-testid="pay-bank">
            {bank.shortName}
          </p>
        </div>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm text-muted-foreground">{t("account")}</dt>
            <dd className="font-mono text-2xl font-semibold break-all">
              {req.accountNo}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">{t("amount")}</dt>
            {amount ? (
              <dd className="text-2xl font-semibold">{amount}</dd>
            ) : (
              <dd data-testid="pay-no-amount">{t("noAmount")}</dd>
            )}
          </div>
          {req.description ? (
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("description")}
              </dt>
              <dd className="break-words">{req.description}</dd>
            </div>
          ) : null}
        </dl>
      </article>
    </Card>
  );
}
