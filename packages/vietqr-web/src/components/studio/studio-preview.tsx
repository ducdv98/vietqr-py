"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApiErrorAlert } from "@/components/api-error";
import { buttonVariants } from "@/components/ui/button";
import type { StudioParams } from "@/lib/studio/params";
import type { StudioPayload } from "@/lib/studio/queries";
import { toQuery } from "@/lib/studio/validate";

export type StudioPreviewProps = {
  /** The generated Payload and Card image; null until the form is valid and generated. */
  payload: StudioPayload | null;
  /** The current form values (ticket 08 builds the Pay link from these). */
  params: StudioParams;
  /** Error from the last generate call, if any. */
  error?: unknown;
  /** A generate call is in flight. */
  pending?: boolean;
};

export const imageHref = (request: StudioPayload["request"]) =>
  `/api/v1/vietqr-core/image?${toQuery(request).toString()}`;

/** Preview area: Card image, Payload and the PNG download. Actions slot in beside the download. */
export function StudioPreview({ payload, error, pending }: StudioPreviewProps) {
  const t = useTranslations("Studio.preview");
  return (
    <section aria-labelledby="studio-preview-title" className="space-y-3">
      <h2 id="studio-preview-title" className="text-lg font-semibold">
        {t("title")}
      </h2>
      {error ? <ApiErrorAlert error={error} /> : null}
      {!error && payload ? (
        <div className="space-y-3" aria-busy={pending ? "true" : "false"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={payload.qrDataURL}
            alt={t("alt")}
            className={
              "mx-auto max-h-[32rem] w-auto max-w-full rounded-md border border-input bg-white" +
              (pending ? " opacity-60" : "")
            }
          />
          <div
            className="flex flex-wrap items-center gap-2"
            data-slot="actions"
          >
            <a
              href={imageHref(payload.request)}
              download
              className={buttonVariants()}
            >
              <Download aria-hidden className="size-4" />
              {t("download")}
            </a>
          </div>
          <div>
            <h3 className="text-sm font-medium">{t("payload")}</h3>
            <code
              data-testid="payload"
              className="mt-1 block rounded-md bg-accent p-2 font-mono text-xs break-all"
            >
              {payload.qrCode}
            </code>
          </div>
        </div>
      ) : null}
      {!error && !payload ? (
        <p className="text-sm text-muted-foreground" role="status">
          {pending ? t("loading") : t("empty")}
        </p>
      ) : null}
    </section>
  );
}
