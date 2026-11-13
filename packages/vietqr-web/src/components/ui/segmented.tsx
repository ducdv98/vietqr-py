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
      className={cn(
        "inline-flex gap-0.5 rounded-md border border-border bg-muted p-[3px]",
        className,
      )}
    >
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "inline-flex h-8 cursor-pointer items-center rounded-[5px] border border-transparent px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
            value === o.value && "border-input bg-card text-foreground",
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
