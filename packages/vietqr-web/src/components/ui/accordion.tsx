import { ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Collapsible section built on native <details>, closed by default. Hairline rules, no box. */
export function Accordion({
  summary,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"details">, "summary"> & {
  summary: React.ReactNode;
}) {
  return (
    <details
      className={cn("group border-y border-border", className)}
      {...props}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-[0.9375rem] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown
          aria-hidden
          className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="pt-1 pb-4">{children}</div>
    </details>
  );
}
