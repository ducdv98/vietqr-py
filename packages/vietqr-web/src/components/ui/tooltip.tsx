import * as React from "react";
import { cn } from "@/lib/utils";

/** CSS-only tooltip; the text is also exposed to assistive tech via aria-label on the trigger. */
export function Tooltip({
  text,
  children,
  className,
}: {
  text: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1 -translate-x-1/2 rounded-sm bg-foreground px-2 py-1 text-xs font-medium whitespace-nowrap shadow-pop text-background opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
