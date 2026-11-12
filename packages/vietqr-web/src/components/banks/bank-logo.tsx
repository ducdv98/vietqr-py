"use client";

import { useState } from "react";

/**
 * Bank logo, loaded from this app's own /api/logos/<code> route (ADR 0003) so the browser never
 * contacts the logo CDN. The catalog's `logo` URL is only used to know whether a logo exists;
 * it is never requested by the browser. Decorative: the bank's name is always rendered next to
 * it. Falls back to the code when the URL is empty or the logo fails to load.
 */
export function BankLogo({
  logo,
  code,
  className = "size-10",
}: {
  logo: string;
  code: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!logo || failed) {
    return (
      <span
        aria-hidden
        className={`${className} inline-flex shrink-0 items-center justify-center rounded-md bg-muted text-[0.625rem] font-semibold text-muted-foreground`}
      >
        {code.slice(0, 4)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/logos/${encodeURIComponent(code)}`}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} shrink-0 rounded-md bg-white object-contain`}
    />
  );
}
