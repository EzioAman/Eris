import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../src/lib/utils';

export interface AccordionItemData {
  id: string;
  title: string;
  content: React.ReactNode;
}

export interface AccordionTemplateProps {
  items: AccordionItemData[];
  defaultOpenId?: string;
  className?: string;
}

export const AccordionTemplate: React.FC<AccordionTemplateProps> = ({
  items,
  defaultOpenId,
  className,
}) => {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId || null);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={cn('w-full divide-y divide-neutral-800 border-y border-neutral-800', className)}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} className="py-2">
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between py-2 text-left text-sm font-medium text-neutral-200 transition-all hover:text-white"
            >
              <span>{item.title}</span>
              <ChevronDown
                className={cn('h-4 w-4 text-neutral-400 transition-transform duration-200', isOpen && 'rotate-180')}
              />
            </button>
            {isOpen && (
              <div className="pb-3 pt-1 text-xs text-neutral-400 leading-relaxed">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
