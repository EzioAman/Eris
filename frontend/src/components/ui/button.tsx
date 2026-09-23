import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'group inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
  {
    variants: {
      variant: {
        default: 'bg-white text-black hover:bg-neutral-200 shadow-sm font-semibold',
        destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
        outline: 'border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] text-white backdrop-blur-md shadow-sm',
        secondary: 'bg-neutral-800/90 text-neutral-100 hover:bg-neutral-700 backdrop-blur-sm shadow-sm',
        ghost: 'hover:bg-white/10 text-neutral-300 hover:text-white',
        link: 'text-neutral-400 hover:text-white underline-offset-4 hover:underline p-0 h-auto font-normal',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-9 px-3.5 text-xs rounded-lg',
        lg: 'h-12 px-8 text-base rounded-xl',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export default Button;
