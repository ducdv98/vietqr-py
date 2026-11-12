/**
 * Response headers for /pay (ADR 0001): payment details live in the URL, so never leak them
 * via Referer and keep the page out of search indexes. Applied in next.config.ts; the page's
 * metadata repeats both as <meta> tags.
 */
export const PAY_SOURCE = "/pay";
export const PAY_HEADERS = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
] as const;
