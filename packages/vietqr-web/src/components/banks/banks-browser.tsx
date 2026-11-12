"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ApiErrorAlert } from "@/components/api-error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { searchBanks } from "@/lib/banks/search";
import { useBanks } from "@/lib/banks/queries";
import { studioHref } from "@/lib/banks/studio-link";
import { BankLogo } from "./bank-logo";

export function BanksBrowser() {
  const t = useTranslations("Banks");
  const { data, isPending, error, refetch } = useBanks();
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchBanks(data ?? [], query), [data, query]);

  return (
    <div className="space-y-4">
      <Card className="space-y-1 p-4">
        <label htmlFor="bank-search" className="text-sm font-medium">
          {t("searchLabel")}
        </label>
        <input
          id="bank-search"
          type="search"
          autoComplete="off"
          aria-describedby="bank-search-hint"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        <p id="bank-search-hint" className="text-xs text-muted-foreground">
          {t("searchHint")}
        </p>
      </Card>

      {isPending ? (
        <div className="space-y-3">
          <p role="status" className="text-sm text-muted-foreground">
            {t("loading")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="space-y-2">
          <ApiErrorAlert error={error} />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t("retry")}
          </Button>
        </div>
      ) : null}

      {data ? (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            {results.length === 0
              ? t("noResults", { query: query.trim() })
              : t("count", { count: results.length })}
          </p>
          <ul aria-label={t("listLabel")} className="grid gap-3 sm:grid-cols-2">
            {results.map((b) => (
              <li
                key={b.bin}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:border-primary/40"
              >
                <BankLogo logo={b.logo} code={b.code} className="size-12" />
                <div className="min-w-0 flex-1 space-y-1">
                  <h2 className="font-medium">
                    <Link
                      href={`/banks/${encodeURIComponent(b.code || b.bin)}`}
                      className="hover:underline"
                    >
                      {b.shortName}
                    </Link>
                  </h2>
                  <p className="text-sm text-muted-foreground">{b.name}</p>
                  <p className="font-mono text-xs">
                    {b.code} · {b.bin}
                  </p>
                  <Link
                    href={studioHref(b)}
                    aria-label={t("openInStudioFor", { name: b.shortName })}
                    className="inline-block text-sm font-medium text-primary underline underline-offset-2"
                  >
                    {t("openInStudio")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
