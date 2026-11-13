"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { BankLogo } from "@/components/banks/bank-logo";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBanks } from "@/lib/banks/queries";

const LOGO_COUNT = 12;

/** Home hero: tagline plus a strip of prominent bank logos (served first-party, ADR 0003). */
export function HomeHero({ showBanksLink }: { showBanksLink: boolean }) {
  const t = useTranslations("Home");
  const { data, isPending } = useBanks();
  const banks = (data ?? []).filter((b) => b.logo).slice(0, LOGO_COUNT);
  return (
    <section
      aria-label={t("heroLabel")}
      className="mb-10 border-b border-border pb-10"
    >
      <Badge variant="secondary">{t("badge")}</Badge>
      <p className="mt-4 max-w-2xl text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl">
        {t("tagline")}
      </p>
      <p className="mt-4 max-w-xl text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-8">
        <p className="mb-3 text-[0.8125rem] font-medium text-muted-foreground">
          {t("supported")}
        </p>
        {isPending ? (
          <div className="flex flex-wrap gap-3" aria-hidden>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="size-14 rounded-lg" />
            ))}
          </div>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {banks.map((b) => (
              <li
                key={b.bin}
                title={b.shortName}
                className="rounded-lg border border-border bg-white p-1.5"
              >
                <BankLogo logo={b.logo} code={b.code} className="size-12" />
                <span className="sr-only">{b.shortName}</span>
              </li>
            ))}
          </ul>
        )}
        {showBanksLink ? (
          <Link
            href="/banks"
            className="mt-4 inline-block text-sm font-semibold text-primary underline underline-offset-4 hover:text-primary-strong"
          >
            {t("allBanks")}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
