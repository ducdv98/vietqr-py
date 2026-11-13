"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string };

/** Top-level destinations; the current one is marked with aria-current and a jade tint. */
export function NavLinks({
  items,
  label,
}: {
  items: NavLink[];
  label: string;
}) {
  const pathname = usePathname();
  const isCurrent = (href: string) =>
    pathname !== null &&
    (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <nav aria-label={label} className="flex gap-0.5">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isCurrent(item.href) ? "page" : undefined}
          className="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground aria-[current=page]:bg-selected aria-[current=page]:text-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
