import * as React from "react";
import { cn } from "@/lib/utils";

/** Collapsible section built on native <details>, closed by default. */
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
      className={cn("rounded-lg border border-border px-4 py-2", className)}
      {...props}
    >
      <summary className="cursor-pointer py-1 text-sm font-medium">
        {summary}
      </summary>
      <div className="pt-2 pb-1">{children}</div>
    </details>
  );
}
