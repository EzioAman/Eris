import React, { useState } from 'react';
import { Search, ChevronDown, RotateCcw } from 'lucide-react';
import { cn } from '../src/lib/utils';
import { Tag } from './TagsTemplate';

export interface FilterOption {
  id: string;
  label: string;
  category: string;
}

export interface FilterBarTemplateProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedFilters?: FilterOption[];
  onFilterToggle?: (filter: FilterOption) => void;
  onClearAll?: () => void;
  isDarkMode?: boolean;
  className?: string;
}

export const FilterBarTemplate: React.FC<FilterBarTemplateProps> = ({
  searchQuery = '',
  onSearchChange,
  selectedFilters = [],
  onFilterToggle,
  onClearAll,
  isDarkMode = true,
  className,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const filterCategories = [
    {
      id: 'provider',
      label: 'Provider',
      options: [
        { id: 'gemini', label: 'Gemini', category: 'provider' },
        { id: 'openrouter', label: 'OpenRouter', category: 'provider' },
        { id: 'nvidia_nim', label: 'Nvidia NIM', category: 'provider' },
      ],
    },
    {
      id: 'capability',
      label: 'Capability',
      options: [
        { id: 'thinking', label: 'Thinking / Reasoning', category: 'capability' },
        { id: 'vision', label: 'Vision', category: 'capability' },
        { id: 'coding', label: 'Coding', category: 'capability' },
        { id: 'audio', label: 'Audio', category: 'capability' },
      ],
    },
    {
      id: 'pricing',
      label: 'Pricing',
      options: [
        { id: 'free', label: 'Free Tier Only', category: 'pricing' },
        { id: 'paid', label: 'Paid / Tiered', category: 'pricing' },
      ],
    },
  ];

  return (
    <div className={cn('w-full font-sans space-y-2.5 select-none', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Unified Search Input */}
        <div className={cn(
          'flex-1 min-w-[200px] flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors shadow-xs',
          isDarkMode
            ? 'bg-[#0F131D] border-neutral-800 text-white focus-within:border-blue-500'
            : 'bg-white border-slate-200 text-slate-900 focus-within:border-blue-500'
        )}>
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Filter models by name, provider, or capability..."
            className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400 font-sans"
          />
        </div>

        {/* Category Dropdowns */}
        {filterCategories.map((cat) => {
          const isOpen = openDropdown === cat.id;
          const activeCount = selectedFilters.filter((f) => f.category === cat.id).length;

          return (
            <div key={cat.id} className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(isOpen ? null : cat.id)}
                className={cn(
                  'cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors shadow-xs',
                  activeCount > 0
                    ? isDarkMode
                      ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                    : isDarkMode
                    ? 'bg-[#0F131D] border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                )}
              >
                <span>{cat.label}</span>
                {activeCount > 0 && (
                  <span className="size-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {activeCount}
                  </span>
                )}
                <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
              </button>

              {isOpen && (
                <div className={cn(
                  'absolute left-0 top-full mt-1.5 w-48 rounded-xl border p-1 shadow-xl z-50 animate-in fade-in',
                  isDarkMode
                    ? 'bg-[#0F131D] border-neutral-800 text-white'
                    : 'bg-white border-slate-200 text-slate-800'
                )}>
                  {cat.options.map((opt) => {
                    const isSelected = selectedFilters.some((f) => f.id === opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onFilterToggle?.(opt);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left',
                          isSelected
                            ? isDarkMode
                              ? 'bg-blue-500/20 text-blue-300 font-semibold'
                              : 'bg-blue-50 text-blue-700 font-semibold'
                            : isDarkMode
                            ? 'hover:bg-white/5 text-neutral-300'
                            : 'hover:bg-slate-100 text-slate-700'
                        )}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <span className="size-1.5 rounded-full bg-blue-500" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Clear All Action */}
        {selectedFilters.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="cursor-pointer flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Active Filter Tags */}
      {selectedFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-400 mr-1">Active:</span>
          {selectedFilters.map((filter) => (
            <Tag
              key={filter.id}
              variant="brand"
              size="sm"
              onRemove={() => onFilterToggle?.(filter)}
            >
              {filter.label}
            </Tag>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterBarTemplate;
