import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none glass border-white/10 placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/30 flex field-sizing-content min-h-16 w-full rounded-xl border px-4 py-3 text-base text-foreground transition-all outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm hover:border-white/20 hover:bg-white/5 focus-visible:bg-white/10",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };