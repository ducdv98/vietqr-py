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
  let text = t("checking");
  if (isError) {
    Icon = CircleX;
    text = t("down");
  } else if (!isPending) {
    Icon = CircleCheck;
    text = version ? t("up", { version }) : t("upNoVersion");
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="flex flex-wrap items-center gap-x-4 gap-y-1"
    >
      <span role="status" className="inline-flex items-center gap-1.5">
        <Icon aria-hidden className="size-4" />
        {text}
      </span>
      {outdated ? (
        <span
          role="alert"
          className="inline-flex items-center gap-1.5 font-medium"
        >
          <CircleAlert aria-hidden className="size-4" />
          {t("outdated", {
            apiVersion: version,
            expected: GENERATED_API_VERSION,
          })}
        </span>
      ) : null}
    </div>
  );
}
