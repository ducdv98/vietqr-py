export type Messages = { [key: string]: string | Messages };
export type Problem = { kind: "missing" | "extra"; key: string };

function leafKeys(messages: Messages, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([k, v]) =>
    typeof v === "string" ? [prefix + k] : leafKeys(v, `${prefix}${k}.`),
  );
}

/** Compare a locale's message keys with the base (en). Values are ignored. */
export function compareMessages(base: Messages, other: Messages): Problem[] {
  const baseKeys = new Set(leafKeys(base));
  const otherKeys = new Set(leafKeys(other));
  return [
    ...[...baseKeys]
      .filter((k) => !otherKeys.has(k))
      .map((key) => ({ kind: "missing" as const, key })),
    ...[...otherKeys]
      .filter((k) => !baseKeys.has(k))
      .map((key) => ({ kind: "extra" as const, key })),
  ];
}
