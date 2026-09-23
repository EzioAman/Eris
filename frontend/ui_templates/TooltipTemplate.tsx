import React, { useState } from 'react';
import { cn } from '../src/lib/utils';

export interface TooltipTemplateProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const TooltipTemplate: React.FC<TooltipTemplateProps> = ({
  content,
  children,
  className,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 whitespace-nowrap rounded-md bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-xs text-neutral-200 shadow-md animate-in fade-in zoom-in-95 duration-100',
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
