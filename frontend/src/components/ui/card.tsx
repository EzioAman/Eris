import * as React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/15 bg-black/75 text-neutral-100 shadow-2xl backdrop-blur-sm transition-all duration-300',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: CardProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-xl sm:text-2xl font-semibold leading-none tracking-tight text-white', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-neutral-400 leading-relaxed font-light', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className = '', children, ...props }: CardProps) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...props }: CardProps) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}
