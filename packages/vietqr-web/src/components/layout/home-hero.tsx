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
      className="mb-8 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8"
    >
      <Badge variant="secondary">{t("badge")}</Badge>
      <p className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
        {t("tagline")}
      </p>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-6">
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          {t("supported")}
        </p>
        {isPending ? (
          <div className="flex flex-wrap gap-3" aria-hidden>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="size-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {banks.map((b) => (
              <li
                key={b.bin}
                title={b.shortName}
                className="rounded-xl border border-border bg-white p-1.5 shadow-sm"
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
            className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("allBanks")}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
