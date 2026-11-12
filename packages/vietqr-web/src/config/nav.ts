import type { PageId } from "@/lib/config/parse";

export type NavItem = { page: PageId; href: string; label: string };

/**
 * Single place to register top-level pages. To add a page: add its id to PAGES in
 * src/lib/config/parse.ts, then add an entry here. `pay` is intentionally not in the
 * nav (it is reached via Pay links) but still gated by enabledPages.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { page: "studio", href: "/", label: "Studio" },
  { page: "inspect", href: "/inspect", label: "Inspect" },
  { page: "banks", href: "/banks", label: "Banks" },
];

export function getNavItems(enabledPages: readonly PageId[]): NavItem[] {
  return NAV_ITEMS.filter((i) => enabledPages.includes(i.page));
}
