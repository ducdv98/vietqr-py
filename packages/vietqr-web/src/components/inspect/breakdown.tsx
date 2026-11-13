"use client";

import { Check, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { BankLogo } from "@/components/banks/bank-logo";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { useConfig } from "@/lib/config";
import { formatVnd } from "@/lib/format/amount";
import { createSimilarHref } from "@/lib/inspect/similar-qr";
import type { InspectResult } from "@/lib/inspect/queries";

export function Breakdown({ info }: { info: InspectResult }) {
  const t = useTranslations("Inspect");
  const locale = useLocale();
  const bank = info.bankInfo;
  const { defaultTemplate } = useConfig();
  const amount = info.amount ? formatVnd(info.amount, locale) : null;
  const tags = Object.entries(info.rawTags).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div className="space-y-4">
      <p>
        <Badge variant={info.isValidCrc ? "default" : "destructive"}>
          {info.isValidCrc ? (
            <Check aria-hidden className="size-3" />
          ) : (
            <X aria-hidden className="size-3" />
          )}
          {info.isValidCrc ? t("crc.valid") : t("crc.invalid")}
        </Badge>
      </p>
      {info.isValidCrc ? null : (
        <Alert tone="danger">{t("crc.invalidDetail")}</Alert>
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
        <dd className="font-mono tabular-nums">{info.accountNo}</dd>
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
        href={createSimilarHref(info, defaultTemplate)}
        className={buttonVariants({ variant: "outline" })}
      >
        {t("similar")}
      </Link>

      <section aria-labelledby="raw-tags" className="space-y-2">
        <h3 id="raw-tags" className="text-lg font-semibold tracking-tight">
          {t("rawTags.title")}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="pr-4 pb-1 text-[0.6875rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
                >
                  {t("rawTags.tag")}
                </th>
                <th
                  scope="col"
                  className="pb-1 text-[0.6875rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
                >
                  {t("rawTags.value")}
                </th>
              </tr>
            </thead>
            <tbody>
              {tags.map(([tag, value]) => (
                <tr key={tag} className="border-t border-border">
                  <td className="py-1.5 pr-4 font-mono font-medium text-primary">
                    {tag}
                  </td>
                  <td className="py-1.5 font-mono break-all">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details>
          <summary className="cursor-pointer text-sm">
            {t("rawTags.payload")}
          </summary>
          <code className="mt-2 block rounded-md border border-border bg-muted p-3 font-mono text-[0.8125rem] leading-5 break-all">
            {info.rawPayload}
          </code>
        </details>
      </section>
    </div>
  );
}
