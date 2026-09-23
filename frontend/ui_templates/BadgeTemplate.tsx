import React from 'react';
import { cn } from '../src/lib/utils';

export interface BadgeTemplateProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'destructive';
}

export const BadgeTemplate: React.FC<BadgeTemplateProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const variants = {
    default: 'border-transparent bg-white text-black',
    secondary: 'border-transparent bg-neutral-800 text-neutral-200',
    outline: 'border-neutral-700 text-neutral-300',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    destructive: 'border-red-500/20 bg-red-500/10 text-red-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
