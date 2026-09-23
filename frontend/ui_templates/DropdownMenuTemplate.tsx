import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../src/lib/utils';

export interface DropdownMenuItemData {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
}

export interface DropdownMenuTemplateProps {
  trigger: React.ReactNode;
  items: DropdownMenuItemData[];
  align?: 'left' | 'right';
  className?: string;
}

export const DropdownMenuTemplate: React.FC<DropdownMenuTemplateProps> = ({
  trigger,
  items,
  align = 'right',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <div onClick={() => setIsOpen((prev) => !prev)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={cn(
            'absolute mt-2 z-50 min-w-[160px] rounded-xl border border-neutral-800 bg-[#0c0c0e]/95 p-1 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                item.onClick?.();
                setIsOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white cursor-pointer',
                item.destructive && 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
