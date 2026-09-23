import React, { useState } from 'react';
import { cn } from '../src/lib/utils';

export interface CollapsibleTemplateProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const CollapsibleTemplate: React.FC<CollapsibleTemplateProps> = ({
  title,
  children,
  defaultOpen = false,
  className,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('w-full border border-neutral-800 rounded-lg p-3', className)}>
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between cursor-pointer text-sm font-medium text-neutral-200"
      >
        {title}
        <span className="text-xs text-neutral-500">{open ? 'Hide' : 'Show'}</span>
      </div>
      {open && <div className="pt-3 text-xs text-neutral-400">{children}</div>}
    </div>
  );
};
