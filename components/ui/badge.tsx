import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-(--color-secondary) text-(--color-secondary-foreground)",
        primary:
          "border-transparent bg-(--color-primary) text-(--color-primary-foreground)",
        destructive:
          "border-transparent bg-(--color-destructive) text-(--color-destructive-foreground)",
        success:
          "border-transparent bg-(--color-success) text-white",
        warning:
          "border-transparent bg-(--color-warning) text-black",
        outline: "text-(--color-foreground)",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
