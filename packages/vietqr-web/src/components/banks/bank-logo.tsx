"use client";

import { useState } from "react";

/**
 * Bank logo from the catalog's `logo` URL (the API returns absolute URLs and serves no logo
 * route of its own). Decorative: the bank's name is always rendered next to it. Falls back to
 * the code when the URL is empty or fails to load. No referrer is sent to the logo host.
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
      src={logo}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} shrink-0 rounded-md bg-white object-contain`}
    />
  );
}
