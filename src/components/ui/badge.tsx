import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3.5",
  {
    variants: {
      tone: {
        neutral: "border-ink-200 bg-ink-50 text-ink-700",
        positive: "border-brand-200 bg-brand-50 text-brand-800",
        warning: "border-warn-100 bg-warn-50 text-warn-700",
        danger: "border-danger-100 bg-danger-50 text-danger-700",
        info: "border-info-100 bg-info-100/50 text-info-700",
        muted: "border-ink-200 bg-white text-ink-500",
        demo: "border-dashed border-demo-700/40 bg-demo-100 text-demo-700",
        dark: "border-ink-900 bg-ink-900 text-white",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
