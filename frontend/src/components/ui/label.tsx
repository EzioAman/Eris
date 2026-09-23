import * as React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`text-xs font-medium uppercase tracking-wider text-neutral-400 select-none ${className}`}
        {...props}
      />
    );
  }
);
Label.displayName = 'Label';
