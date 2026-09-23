import React from 'react';
import { cn } from '../src/lib/utils';

export interface ShineBorderTemplateProps extends React.HTMLAttributes<HTMLDivElement> {
  borderWidth?: number;
  duration?: number;
  shineColor?: string | string[];
}

/**
 * ShineBorderTemplate
 *
 * An animated specular glow border effect template with customizable colors and duration.
 */
export const ShineBorderTemplate: React.FC<ShineBorderTemplateProps> = ({
  borderWidth = 1.5,
  duration = 14,
  shineColor = ['#8B5CF6', '#38BDF8', '#EC4899'],
  className,
  style,
  children,
  ...props
}) => {
  return (
    <div
      style={
        {
          '--border-width': `${borderWidth}px`,
          '--duration': `${duration}s`,
          backgroundImage: `radial-gradient(transparent, transparent, ${
            Array.isArray(shineColor) ? shineColor.join(',') : shineColor
          }, transparent, transparent)`,
          backgroundSize: '300% 300%',
          mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: 'var(--border-width)',
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        'motion-safe:animate-shine pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default ShineBorderTemplate;
