import React from 'react';
import { cn } from '../src/lib/utils';

export interface ToggleTemplateProps {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const ToggleTemplate: React.FC<ToggleTemplateProps> = ({
  pressed,
  onPressedChange,
  children,
  className,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors px-2.5 py-1.5 border border-neutral-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
        pressed
          ? 'bg-white text-black border-white'
          : 'bg-transparent text-neutral-300 hover:bg-neutral-800 hover:text-white',
        className
      )}
    >
      {children}
    </button>
  );
};
