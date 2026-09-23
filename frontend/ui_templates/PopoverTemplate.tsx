import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../src/lib/utils';

export interface PopoverTemplateProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export const PopoverTemplate: React.FC<PopoverTemplateProps> = ({
  trigger,
  children,
  align = 'center',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  let alignClass = '-translate-x-1/2 left-1/2';
  if (align === 'left') alignClass = 'left-0';
  if (align === 'right') alignClass = 'right-0';

  return (
    <div className="relative inline-block" ref={ref}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>

      {open && (
        <div
          className={cn(
            'absolute top-full mt-2 z-50 w-72 rounded-xl border border-neutral-800 bg-[#0c0c0e]/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100',
            alignClass,
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};
