export type UploadCheck =
  { ok: true } | { ok: false; reason: "tooLarge" | "notImage" | "empty" };

/** Client-side guard before sending an image to /decode; `maxBytes` is the server config limit. */
export function checkUpload(
  file: { size: number; type: string },
  maxBytes: number,
): UploadCheck {
  if (!file.type.startsWith("image/")) return { ok: false, reason: "notImage" };
  if (file.size === 0) return { ok: false, reason: "empty" };
  if (file.size > maxBytes) return { ok: false, reason: "tooLarge" };
  return { ok: true };
}

/** Human-readable size for limits, e.g. 8388608 -> "8 MB". */
export function formatBytes(bytes: number): string {
  const trim = (n: number) => String(Number(n.toFixed(1)));
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${trim(bytes / 1024)} KB`;
  return `${trim(bytes / (1024 * 1024))} MB`;
}
