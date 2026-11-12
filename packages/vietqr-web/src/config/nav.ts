import type { PageId } from "@/lib/config/parse";

export type NavItem = {
  page: PageId;
  href: string;
  labelKey: "studio" | "inspect" | "banks";
};

/**
 * Single place to register top-level pages. To add a page: add its id to PAGES in
 * src/lib/config/parse.ts, then add an entry here and its label under "Nav" in every messages/<locale>.json. `pay` is intentionally not in the
 * nav (it is reached via Pay links) but still gated by enabledPages.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { page: "studio", href: "/", labelKey: "studio" },
  { page: "inspect", href: "/inspect", labelKey: "inspect" },
  { page: "banks", href: "/banks", labelKey: "banks" },
];

export function getNavItems(enabledPages: readonly PageId[]): NavItem[] {
  return NAV_ITEMS.filter((i) => enabledPages.includes(i.page));
}
