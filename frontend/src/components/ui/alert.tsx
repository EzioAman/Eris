import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const alertVariants = cva(
  "relative w-full rounded-2xl border p-4 text-sm transition-all duration-200 backdrop-blur-xl shadow-lg flex items-start gap-3.5 text-left",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--bg-card)] border-[var(--border-workspace)] text-[var(--text-primary)]",
        destructive:
          "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200 dark:bg-red-950/30 shadow-rose-950/10",
        success:
          "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200 dark:bg-emerald-950/30 shadow-emerald-950/10",
        info:
          "bg-sky-500/10 border-sky-500/30 text-sky-800 dark:text-sky-200 dark:bg-sky-950/30 shadow-sky-950/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const iconVariantColor = {
  default: "text-[var(--text-secondary)]",
  destructive: "text-rose-500 dark:text-rose-400",
  success: "text-emerald-600 dark:text-emerald-400",
  info: "text-sky-600 dark:text-sky-400",
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ComponentType<{ className?: string }>;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", icon: Icon, children, ...props }, ref) => {
    const v = variant || "default";

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant: v }), className)}
        {...props}
      >
        {Icon && (
          <div className="shrink-0 pt-0.5">
            <Icon className={cn("size-4 stroke-[2]", iconVariantColor[v])} />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1 text-left">{children}</div>
      </div>
    );
  }
);
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "font-semibold leading-tight tracking-tight text-sm text-[var(--text-primary)] text-left",
      className
    )}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-xs leading-relaxed text-[var(--text-secondary)] font-normal text-left [&_p]:leading-relaxed",
      className
    )}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export default Alert;
