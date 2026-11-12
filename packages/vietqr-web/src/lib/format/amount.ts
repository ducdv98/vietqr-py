/** An amount in VND formatted for the active locale (shared by Inspect and Pay). */
export function formatVnd(amount: string | number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 2,
  }).format(Number(amount));
}
