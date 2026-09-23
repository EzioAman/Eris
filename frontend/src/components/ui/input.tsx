import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={`flex h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-3.5 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:border-cyan-400/80 disabled:cursor-not-allowed disabled:opacity-50 transition-colors backdrop-blur-sm select-text ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
