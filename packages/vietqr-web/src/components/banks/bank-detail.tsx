"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ApiErrorAlert } from "@/components/api-error";
import { useBank } from "@/lib/banks/queries";
import { studioHref } from "@/lib/banks/studio-link";
import { BankLogo } from "./bank-logo";

export function BankDetail({ binOrCode }: { binOrCode: string }) {
  const t = useTranslations("Banks");
  const { data, isPending, error } = useBank(binOrCode);

  return (
    <div className="space-y-4">
      <Link href="/banks" className="text-sm underline">
        {t("back")}
      </Link>
      {isPending ? <p role="status">{t("loading")}</p> : null}
      {error ? <ApiErrorAlert error={error} /> : null}
      {data ? (
        <article className="space-y-4">
          <div className="flex items-center gap-4">
            <BankLogo logo={data.logo} code={data.code} className="size-16" />
            <h1 className="text-2xl font-semibold">{data.shortName}</h1>
          </div>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t("fields.name")}</dt>
            <dd>{data.name}</dd>
            <dt className="text-muted-foreground">{t("fields.shortName")}</dt>
            <dd>{data.shortName}</dd>
            <dt className="text-muted-foreground">{t("fields.code")}</dt>
            <dd className="font-mono">{data.code}</dd>
            <dt className="text-muted-foreground">{t("fields.bin")}</dt>
            <dd className="font-mono">{data.bin}</dd>
          </dl>
          <Link
            href={studioHref(data)}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("openInStudio")}
          </Link>
        </article>
      ) : null}
    </div>
  );
}
