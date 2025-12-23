import * as React from "react";
import { Slot } from "@radix-ui/react-slot@1.1.2";
import { cva, type VariantProps } from "class-variance-authority@0.7.1";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-all overflow-hidden backdrop-blur-sm",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 gradient-purple text-primary-foreground shadow-md [a&]:hover:opacity-90",
        secondary:
          "border-white/20 bg-white/10 text-foreground [a&]:hover:bg-white/20",
        destructive:
          "border-destructive/30 bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 shadow-md",
        outline:
          "border-white/20 text-foreground [a&]:hover:bg-white/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };