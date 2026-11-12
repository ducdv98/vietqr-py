export type SearchableBank = {
  bin: string;
  code: string;
  shortName: string;
  name: string;
};

/** Lowercases and strips diacritics (Vietnamese đ included) so "Quân Đội" folds to "quan doi". */
export function foldText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
}

/** Lower is better; Infinity means no match. */
function score(bank: SearchableBank, tokens: string[]): number {
  const fields = [bank.code, bank.bin, bank.shortName, bank.name].map(foldText);
  let total = 0;
  for (const token of tokens) {
    let best = Infinity;
    fields.forEach((f, i) => {
      if (f === token) best = Math.min(best, i < 2 ? 0 : 1);
      else if (f.startsWith(token)) best = Math.min(best, 2);
      else if (f.split(/\s+/).some((w) => w.startsWith(token)))
        best = Math.min(best, 3);
      else if (f.includes(token)) best = Math.min(best, 4);
    });
    if (best === Infinity) return Infinity;
    total += best;
  }
  return total;
}

/**
 * Filters banks by name, short name, code or BIN, ignoring case and diacritics. Every
 * whitespace-separated word must match somewhere. Results are ranked (exact code/BIN,
 * prefix, word prefix, substring) and keep catalog order among ties. Blank query returns all.
 */
export function searchBanks<T extends SearchableBank>(
  banks: readonly T[],
  query: string,
): T[] {
  const tokens = foldText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [...banks];
  return banks
    .map((bank, index) => ({ bank, index, s: score(bank, tokens) }))
    .filter((r) => r.s !== Infinity)
    .sort((a, b) => a.s - b.s || a.index - b.index)
    .map((r) => r.bank);
}
