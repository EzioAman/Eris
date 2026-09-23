import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type FC,
} from "react"

import { cn } from "../../lib/utils"

export interface AnimatedShinyTextProps extends ComponentPropsWithoutRef<"span"> {
  shimmerWidth?: number
}

export const AnimatedShinyText: FC<AnimatedShinyTextProps> = ({
  children,
  className,
  shimmerWidth = 100,
  ...props
}) => {
  return (
    <span
      style={
        {
          "--shiny-width": `${shimmerWidth}px`,
        } as CSSProperties
      }
      className={cn(
        "mx-auto max-w-md text-neutral-400",

        // Shine effect
        "animate-shiny-text bg-clip-text bg-no-repeat [transition:background-position_1s_cubic-bezier(.6,.6,0,1)_infinite]",

        // Shine gradient
        "bg-gradient-to-r from-transparent via-white/90 via-50% to-transparent",

        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
