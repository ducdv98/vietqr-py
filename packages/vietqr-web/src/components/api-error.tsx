"use client";

import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/unwrap";

const asApiError = (e: unknown): ApiError =>
  e instanceof ApiError
    ? e
    : new ApiError("99", e instanceof Error ? e.message : String(e), null, 0);

/** Returns a function mapping an error to localized copy; unknown codes fall back to `desc`. */
export function useApiErrorMessage(): (error: unknown) => string {
  const t = useTranslations("Errors");
  return (error) => {
    const e = asApiError(error);
    const key = `codes.${e.code}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return t.has(key as any) ? t(key as any) : e.desc;
  };
}

/** Alert with the localized message and collapsible technical detail (desc, correlation ID). */
export function ApiErrorAlert({
  error,
  className,
  message: override,
}: {
  error: unknown;
  className?: string;
  /** Page-specific headline replacing the generic one for this error code. */
  message?: string;
}) {
  const t = useTranslations("Errors");
  const message = useApiErrorMessage();
  const e = asApiError(error);
  return (
    <Alert tone="danger" className={className}>
      <p className="font-semibold text-destructive">{override ?? message(e)}</p>
      <details className="mt-2">
        <summary className="cursor-pointer text-[0.8125rem] text-muted-foreground">
          {t("technicalDetail")}
        </summary>
        <dl className="mt-1 space-y-1 font-mono text-xs break-words text-muted-foreground">
          <div>
            <dt className="inline">{t("code")}: </dt>
            <dd className="inline">{e.code}</dd>
          </div>
          <div>
            <dt className="inline">{t("desc")}: </dt>
            <dd className="inline">{e.desc}</dd>
          </div>
          {e.correlationId && (
            <div>
              <dt className="inline">{t("correlationId")}: </dt>
              <dd className="inline">{e.correlationId}</dd>
            </div>
          )}
        </dl>
      </details>
    </Alert>
  );
}
