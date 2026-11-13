"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApiErrorAlert } from "@/components/api-error";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TEMPLATES,
  type StudioParams,
  type Template,
} from "@/lib/studio/params";
import type { StudioPayload } from "@/lib/studio/queries";
import { CopyActions } from "./copy-actions";
import { qrTypeOf, toQuery } from "@/lib/studio/validate";

export type StudioPreviewProps = {
  /** The generated Payload and Card image; null until the user has clicked Generate. */
  payload: StudioPayload | null;
  /** The current form values (the Pay link is built from these). */
  params: StudioParams;
  /** Error from the last generate call, if any. */
  error?: unknown;
  /** A generate call is in flight. */
  pending?: boolean;
  /** The form changed since this result was generated. */
  outdated?: boolean;
  /** Switch the Template; the parent re-renders without another Generate. */
  onTemplateChange?: (template: Template) => void;
  /** Receives the section element so the parent can scroll to it. */
  sectionRef?: React.Ref<HTMLElement>;
};

export const imageHref = (request: StudioPayload["request"]) =>
  `/api/v1/vietqr-core/image?${toQuery(request).toString()}`;

/** Result pane: Card image, Template chips, actions, Payload details and the privacy note. */
export function StudioPreview({
  payload,
  params,
  error,
  pending,
  outdated,
  onTemplateChange,
  sectionRef,
}: StudioPreviewProps) {
  const t = useTranslations("Studio.preview");
  const tf = useTranslations("Studio");
  return (
    <section
      ref={sectionRef}
      aria-labelledby="studio-preview-title"
      className="scroll-mt-20 space-y-3 lg:sticky lg:top-20"
    >
      <h2
        id="studio-preview-title"
        className="text-[0.6875rem] leading-4 font-semibold tracking-[0.08em] text-muted-foreground uppercase"
      >
        {t("title")}
      </h2>
      {error ? <ApiErrorAlert error={error} /> : null}
      {!error && payload ? (
        <Card
          aria-busy={pending ? "true" : "false"}
          className="rounded-2xl shadow-lift"
        >
          <CardContent className="space-y-4 p-5">
            {outdated ? <Badge variant="warning">{t("outdated")}</Badge> : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={payload.qrDataURL}
              alt={t("alt")}
              className={
                "mx-auto max-h-[32rem] w-auto max-w-full rounded-lg border border-border bg-[var(--qr-ground)]" +
                (pending || outdated ? " opacity-60" : "")
              }
            />
            <Segmented
              name="template"
              aria-label={tf("fields.template")}
              value={params.template}
              onValueChange={(v) => onTemplateChange?.(v)}
              options={TEMPLATES.map((tpl) => ({
                value: tpl,
                label: tf(`templates.${tpl}`),
              }))}
              className="flex-wrap"
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
            <p data-testid="qr-type">
              <span className="text-sm font-medium">{t("qrType")}: </span>
              {t(`qrTypes.${qrTypeOf(payload.request)}`)}
              <span className="block text-[0.8125rem] leading-5 text-subtle-foreground">
                {t(`qrTypeNote.${qrTypeOf(payload.request)}`)}
              </span>
            </p>
            <CopyActions
              payload={payload}
              params={params}
              detailsLabel={t("payloadDetails")}
              details={
                <code
                  data-testid="payload"
                  className="block rounded-md border border-border bg-muted p-3 font-mono text-[0.8125rem] leading-5 break-all text-foreground"
                >
                  {payload.qrCode}
                </code>
              }
            />
            <p className="text-sm">{t("scanHint")}</p>
            <p className="text-[0.8125rem] leading-5 text-subtle-foreground">
              {t("storedNote")}
            </p>
          </CardContent>
        </Card>
      ) : null}
      {!error && !payload ? (
        pending ? (
          <div role="status" className="space-y-2">
            <Skeleton className="mx-auto h-64 w-64 max-w-full" />
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          </div>
        ) : (
          <p
            className="rounded-lg border border-dashed border-input bg-muted p-10 text-center text-sm text-muted-foreground"
            role="status"
          >
            {t("empty")}
          </p>
        )
      ) : null}
    </section>
  );
}
