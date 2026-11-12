import type { Bank } from "./queries";

/**
 * The bank a user-supplied value refers to: an exact BIN or a case-insensitive code.
 * Returns null for an empty, nullish or unknown value.
 */
export function findBank<B extends Pick<Bank, "bin" | "code">>(
  banks: readonly B[],
  value: string | null | undefined,
): B | null {
  const v = value?.trim().toLowerCase();
  if (!v) return null;
  return banks.find((b) => b.bin === v || b.code.toLowerCase() === v) ?? null;
}
