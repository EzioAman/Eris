import * as React from "react";
import { cn } from "../../lib/utils";

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "li";
}

export const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ className = "", as = "p", ...props }, ref) => {
    const Component = as as any;
    return (
      <Component
        ref={ref}
        className={cn("text-sm text-neutral-300 font-sans", className)}
        {...props}
      />
    );
  }
);

Text.displayName = "Text";

export default Text;
