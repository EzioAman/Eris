import React from 'react';
import { cn } from '../src/lib/utils';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface RadioGroupTemplateProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const RadioGroupTemplate: React.FC<RadioGroupTemplateProps> = ({
  name,
  options,
  value,
  onChange,
  className,
}) => {
  return (
    <div className={cn('grid gap-2', className)}>
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <label
            key={opt.value}
            className={cn(
              'flex items-start space-x-3 rounded-lg border border-neutral-800 p-3 transition-colors cursor-pointer',
              isSelected ? 'bg-neutral-900 border-neutral-700' : 'hover:bg-neutral-900/50'
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={isSelected}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 h-4 w-4 text-white border-neutral-700 bg-neutral-900 focus:ring-0 cursor-pointer"
            />
            <div className="text-left text-xs">
              <span className="font-medium text-neutral-200">{opt.label}</span>
              {opt.description && (
                <p className="text-[11px] text-neutral-400 pt-0.5">{opt.description}</p>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
};
