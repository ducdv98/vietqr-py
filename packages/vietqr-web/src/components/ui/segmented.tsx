"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

/** Single-choice control rendered as native radios inside a radiogroup. */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  name,
  "aria-label": ariaLabel,
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
  name: string;
  "aria-label": string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex rounded-lg bg-muted p-1", className)}
    >
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
            value === o.value && "bg-card text-foreground shadow-sm",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onValueChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}
