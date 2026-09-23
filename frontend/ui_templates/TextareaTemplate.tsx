import React from 'react';
import { cn } from '../src/lib/utils';

export interface TextareaTemplateProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const TextareaTemplate = React.forwardRef<
  HTMLTextAreaElement,
  TextareaTemplateProps
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});
TextareaTemplate.displayName = 'TextareaTemplate';
