"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ApiErrorAlert } from "@/components/api-error";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBank } from "@/lib/banks/queries";
import { studioHref } from "@/lib/banks/studio-link";
import { BankLogo } from "./bank-logo";

export function BankDetail({ binOrCode }: { binOrCode: string }) {
  const t = useTranslations("Banks");
  const { data, isPending, error } = useBank(binOrCode);

  return (
    <div className="space-y-4">
      <Link
        href="/banks"
        className="text-sm text-primary underline underline-offset-2"
      >
        {t("back")}
      </Link>
      {isPending ? (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            {t("loading")}
          </p>
          <Skeleton className="h-40" />
        </>
      ) : null}
      {error ? <ApiErrorAlert error={error} /> : null}
      {data ? (
        <Card>
          <CardContent className="p-5">
            <article className="space-y-4">
              <div className="flex items-center gap-4">
                <BankLogo
                  logo={data.logo}
                  code={data.code}
                  className="size-16"
                />
                <h1 className="text-3xl font-semibold tracking-tight">
                  {data.shortName}
                </h1>
              </div>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground">{t("fields.name")}</dt>
                <dd>{data.name}</dd>
                <dt className="text-muted-foreground">
                  {t("fields.shortName")}
                </dt>
                <dd>{data.shortName}</dd>
                <dt className="text-muted-foreground">{t("fields.code")}</dt>
                <dd className="font-mono">{data.code}</dd>
                <dt className="text-muted-foreground">{t("fields.bin")}</dt>
                <dd className="font-mono">{data.bin}</dd>
              </dl>
              <Link href={studioHref(data)} className={buttonVariants()}>
                {t("openInStudio")}
              </Link>
            </article>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
