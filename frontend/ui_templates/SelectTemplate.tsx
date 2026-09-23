import React from 'react';
import { cn } from '../src/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectTemplateProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

export const SelectTemplate = React.forwardRef<
  HTMLSelectElement,
  SelectTemplateProps
>(({ className, options, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1 text-sm text-neutral-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
        className
      )}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-neutral-900 text-white">
          {opt.label}
        </option>
      ))}
    </select>
  );
});
SelectTemplate.displayName = 'SelectTemplate';
