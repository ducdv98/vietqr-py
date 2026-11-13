import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-[22px] items-center gap-1.5 rounded-sm px-2 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        /** Valid / ready. */
        default: "bg-selected text-primary-strong",
        secondary: "border border-border bg-muted text-muted-foreground",
        info: "bg-info-tint text-info",
        warning: "bg-warning text-warning-foreground",
        destructive: "bg-destructive-tint text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
