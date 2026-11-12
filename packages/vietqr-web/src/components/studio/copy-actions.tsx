"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useConfig } from "@/lib/config";
import type { StudioParams } from "@/lib/studio/params";
import type { StudioPayload } from "@/lib/studio/queries";
import { buildEmbedUrl, buildPayLink } from "@/lib/studio/copy";

type Kind = "payload" | "payLink" | "embedUrl";

export type CopyActionsProps = {
  payload: StudioPayload;
  params: StudioParams;
};

/** Copy Payload, Pay link (only when the Pay page is enabled) and the GET /image embed URL. */
export function CopyActions({ payload, params }: CopyActionsProps) {
  const t = useTranslations("Studio.copy");
  const { enabledPages, defaultTemplate } = useConfig();
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState<Kind | null>(null);
  const payEnabled = enabledPages.includes("pay");

  async function copy(kind: Kind, text: () => string) {
    try {
      await navigator.clipboard.writeText(text());
      setCopied(kind);
      setStatus(t(`copied.${kind}`));
    } catch {
      setCopied(null);
      setStatus(t("failed"));
    }
  }

  const button = (kind: Kind, text: () => string) => (
    <button
      type="button"
      className={buttonVariants({ variant: "outline" })}
      onClick={() => copy(kind, text)}
    >
      {copied === kind ? (
        <Check aria-hidden className="size-4" />
      ) : (
        <Copy aria-hidden className="size-4" />
      )}
      {t(`actions.${kind}`)}
    </button>
  );

  return (
    <div className="space-y-2" data-slot="copy">
      <div className="flex flex-wrap items-center gap-2">
        {button("payload", () => payload.qrCode)}
        {payEnabled
          ? button("payLink", () =>
              buildPayLink(window.location.origin, params, defaultTemplate),
            )
          : null}
        {button("embedUrl", () =>
          buildEmbedUrl(window.location.origin, payload.request),
        )}
      </div>
      <p
        data-testid="embed-warning"
        className="text-xs text-amber-700 dark:text-amber-400"
      >
        {t("embedWarning")}
      </p>
      <p role="status" aria-live="polite" className="text-sm">
        {status}
      </p>
    </div>
  );
}
