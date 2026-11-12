"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { BankLogo } from "@/components/banks/bank-logo";
import { createSimilarHref } from "@/lib/inspect/similar-qr";
import type { InspectResult } from "@/lib/inspect/queries";

export function Breakdown({ info }: { info: InspectResult }) {
  const t = useTranslations("Inspect");
  const locale = useLocale();
  const bank = info.bankInfo;
  const amount = info.amount
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 2,
      }).format(Number(info.amount))
    : null;
  const tags = Object.entries(info.rawTags).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div className="space-y-4">
      <p
        className={
          info.isValidCrc
            ? "inline-block rounded-md bg-green-500/15 px-2 py-1 text-sm font-medium"
            : "inline-block rounded-md bg-red-500/15 px-2 py-1 text-sm font-medium"
        }
      >
        {info.isValidCrc ? t("crc.valid") : t("crc.invalid")}
      </p>
      {info.isValidCrc ? null : (
        <p
          role="alert"
          className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm"
        >
          {t("crc.invalidDetail")}
        </p>
      )}

      <dl className="grid grid-cols-[max-content_1fr] items-center gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{t("fields.bank")}</dt>
        <dd className="flex items-center gap-2">
          {bank ? (
            <>
              <BankLogo logo={bank.logo} code={bank.code} />
              <span>{bank.shortName}</span>
            </>
          ) : (
            <span>{t("fields.unknownBank", { bin: info.bankBin })}</span>
          )}
        </dd>
        <dt className="text-muted-foreground">{t("fields.account")}</dt>
        <dd className="font-mono">{info.accountNo}</dd>
        <dt className="text-muted-foreground">{t("fields.amount")}</dt>
        <dd>{amount ?? t("fields.noAmount")}</dd>
        <dt className="text-muted-foreground">{t("fields.description")}</dt>
        <dd>{info.description || t("fields.noDescription")}</dd>
        <dt className="text-muted-foreground">{t("fields.qrType")}</dt>
        <dd>{info.isDynamic ? t("qrType.dynamic") : t("qrType.static")}</dd>
        <dt className="text-muted-foreground">{t("fields.serviceType")}</dt>
        <dd>
          {info.serviceType === "card"
            ? t("serviceType.card")
            : t("serviceType.account")}
        </dd>
        {info.crc ? (
          <>
            <dt className="text-muted-foreground">{t("fields.crc")}</dt>
            <dd className="font-mono">{info.crc}</dd>
          </>
        ) : null}
      </dl>

      <Link
        href={createSimilarHref(info)}
        className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t("similar")}
      </Link>

      <section aria-labelledby="raw-tags" className="space-y-2">
        <h3 id="raw-tags" className="font-medium">
          {t("rawTags.title")}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th scope="col" className="pr-4 font-medium">
                  {t("rawTags.tag")}
                </th>
                <th scope="col" className="font-medium">
                  {t("rawTags.value")}
                </th>
              </tr>
            </thead>
            <tbody>
              {tags.map(([tag, value]) => (
                <tr key={tag} className="border-t">
                  <td className="pr-4 py-1 font-mono">{tag}</td>
                  <td className="py-1 font-mono break-all">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details>
          <summary className="cursor-pointer text-sm">
            {t("rawTags.payload")}
          </summary>
          <code className="mt-1 block font-mono text-xs break-all">
            {info.rawPayload}
          </code>
        </details>
      </section>
    </div>
  );
}
