import React from 'react';
import { cn } from '../src/lib/utils';

export interface SwitchTemplateProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const SwitchTemplate: React.FC<SwitchTemplateProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  id,
}) => {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-white' : 'bg-neutral-800',
        className
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-4 bg-black' : 'translate-x-0 bg-neutral-400'
        )}
      />
    </button>
  );
};
