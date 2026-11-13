import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const TONES = {
  danger: {
    box: "bg-destructive-tint",
    icon: "text-destructive",
    Icon: CircleAlert,
  },
  warning: {
    box: "bg-warning",
    icon: "text-warning-foreground",
    Icon: TriangleAlert,
  },
  info: { box: "bg-info-tint", icon: "text-info", Icon: Info },
} as const;

/** Inline message about the task at hand. The icon and the text carry the meaning; the tint supports it. */
export function Alert({
  tone = "danger",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { tone?: keyof typeof TONES }) {
  const { box, icon, Icon } = TONES[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-lg px-4 py-3 text-sm text-foreground",
        box,
        className,
      )}
      {...props}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", icon)} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
