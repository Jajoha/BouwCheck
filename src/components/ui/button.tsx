import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
        dark: "bg-ink-900 text-white hover:bg-ink-800 shadow-sm",
        accent: "bg-accent-400 text-ink-950 font-semibold hover:bg-accent-300 shadow-sm",
        secondary: "bg-ink-100 text-ink-900 hover:bg-ink-200",
        outline: "border border-ink-200 bg-white text-ink-900 hover:bg-ink-50 hover:border-ink-300",
        ghost: "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
        danger: "bg-danger-600 text-white hover:bg-danger-700",
        "danger-outline": "border border-danger-100 bg-white text-danger-700 hover:bg-danger-50",
        link: "text-brand-700 underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
