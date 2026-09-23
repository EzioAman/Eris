import React from 'react';
import { cn } from '../src/lib/utils';

export interface ProgressTemplateProps {
  value?: number;
  max?: number;
  className?: string;
}

export const ProgressTemplate: React.FC<ProgressTemplateProps> = ({
  value = 0,
  max = 100,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-neutral-800', className)}
    >
      <div
        className="h-full bg-white transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
