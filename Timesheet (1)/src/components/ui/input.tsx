import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground glass flex h-10 w-full min-w-0 rounded-xl border border-white/10 px-4 py-2 text-base text-foreground transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:bg-white/10",
        "hover:border-white/20 hover:bg-white/5",
        className,
      )}
      {...props}
    />
  );
}

export { Input };