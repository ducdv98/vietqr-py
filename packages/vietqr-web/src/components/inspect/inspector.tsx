"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type DragEvent, type FormEvent } from "react";
import { ApiErrorAlert } from "@/components/api-error";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/unwrap";
import { useConfig } from "@/lib/config";
import { useInspect } from "@/lib/inspect/queries";
import { checkUpload, formatBytes } from "@/lib/inspect/upload";
import { Breakdown } from "./breakdown";

export function Inspector() {
  const t = useTranslations("Inspect");
  const { maxUploadBytes } = useConfig();
  const limit = formatBytes(maxUploadBytes);
  const inspect = useInspect();
  const [payload, setPayload] = useState("");
  const [source, setSource] = useState<"payload" | "image" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const payloadId = useId();
  const hintId = useId();

  function submitPayload(e: FormEvent) {
    e.preventDefault();
    if (!payload.trim()) return;
    setUploadError(null);
    setSource("payload");
    inspect.mutate({ kind: "payload", payload });
  }

  function submitFile(file: File | undefined) {
    if (!file) return;
    const check = checkUpload(file, maxUploadBytes);
    if (!check.ok) {
      inspect.reset();
      setSource(null);
      setUploadError(t(`upload.${check.reason}`, { limit }));
      return;
    }
    setUploadError(null);
    setSource("image");
    inspect.mutate({ kind: "image", file });
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    submitFile(e.dataTransfer.files[0]);
  }

  const err = inspect.error;
  const specific =
    err instanceof ApiError && (err.code === "06" || err.code === "07")
      ? err.code === "07"
        ? t("errors.notVietQr")
        : t("errors.decodeFailed")
      : null;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <form onSubmit={submitPayload} className="space-y-2">
          <label htmlFor={payloadId} className="block font-medium">
            {t("payload.label")}
          </label>
          <p id={hintId} className="text-sm text-muted-foreground">
            {t("payload.hint")}
          </p>
          <textarea
            id={payloadId}
            aria-describedby={hintId}
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder={t("payload.placeholder")}
            rows={4}
            spellCheck={false}
            className="w-full rounded-md border border-input bg-card p-3 font-mono text-[0.8125rem] leading-5 hover:border-muted-foreground focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-ring"
          />
          <button type="submit" className={buttonVariants()}>
            {t("payload.submit")}
          </button>
        </form>
      </Card>

      <div
        data-testid="dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-lg border border-dashed border-input bg-card p-6 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring ${dragging ? "border-primary bg-selected" : ""}`}
      >
        <label className="block cursor-pointer space-y-2">
          <span className="block font-medium">{t("image.label")}</span>
          <span className="block text-sm">{t("image.drop")}</span>
          <span className="block text-sm text-muted-foreground">
            {t("image.hint", { limit })}
          </span>
          <input
            type="file"
            accept="image/*"
            aria-label={t("image.choose")}
            className="mx-auto block max-w-full text-sm"
            onChange={(e) => {
              submitFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <section aria-live="polite" aria-label={t("result.title")}>
        {uploadError ? <Alert tone="danger">{uploadError}</Alert> : null}
        {inspect.isPending ? (
          <div className="space-y-2">
            <p role="status" className="text-sm text-muted-foreground">
              {t("result.reading")}
            </p>
            <Skeleton className="h-32" />
          </div>
        ) : null}
        {err ? (
          <ApiErrorAlert error={err} message={specific ?? undefined} />
        ) : null}
        {inspect.data ? (
          <Card className="space-y-3 p-5">
            <h2 className="text-lg font-semibold">{t("result.title")}</h2>
            {source ? (
              <p className="text-sm text-muted-foreground">
                {t(`result.source.${source}`)}
              </p>
            ) : null}
            <Breakdown info={inspect.data} />
          </Card>
        ) : null}
      </section>
    </div>
  );
}
