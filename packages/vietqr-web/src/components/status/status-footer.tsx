"use client";

import { CircleAlert, CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useHealth } from "@/lib/api/health";
import { isOlder } from "@/lib/api/semver";
import { GENERATED_API_VERSION } from "@/lib/api/version";

/** API health + version indicator. State is conveyed by icon and text, never color alone. */
export function StatusFooter() {
  const t = useTranslations("Status");
  const { data, isPending, isError } = useHealth();
  const version = data?.version ?? null;
  const outdated = version !== null && isOlder(version, GENERATED_API_VERSION);

  let Icon = LoaderCircle;
  let tone = "text-subtle-foreground";
  let text = t("checking");
  if (isError) {
    Icon = CircleX;
    tone = "text-destructive";
    text = t("down");
  } else if (!isPending) {
    Icon = CircleCheck;
    tone = "text-primary";
    text = version ? t("up", { version }) : t("upNoVersion");
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
    >
      <span
        role="status"
        className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-card px-2.5"
      >
        <Icon aria-hidden className={`size-3.5 ${tone}`} />
        {text}
      </span>
      {outdated ? (
        <span
          role="alert"
          className="inline-flex items-center gap-1.5 font-medium text-warning-foreground"
        >
          <CircleAlert aria-hidden className="size-3.5" />
          {t("outdated", {
            apiVersion: version,
            expected: GENERATED_API_VERSION,
          })}
        </span>
      ) : null}
    </div>
  );
}
