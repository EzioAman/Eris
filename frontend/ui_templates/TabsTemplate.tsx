import React, { useState } from 'react';
import { cn } from '../src/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface TabsTemplateProps {
  tabs: TabItem[];
  defaultTabId?: string;
  className?: string;
}

export const TabsTemplate: React.FC<TabsTemplateProps> = ({
  tabs,
  defaultTabId,
  className,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTabId || tabs[0]?.id);

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div className={cn('w-full flex flex-col space-y-4', className)}>
      <div className="inline-flex h-9 items-center justify-center rounded-lg bg-neutral-900 p-1 text-neutral-400 border border-neutral-800">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer',
                isActive
                  ? 'bg-neutral-800 text-white shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="pt-2">{activeContent}</div>
    </div>
  );
};
