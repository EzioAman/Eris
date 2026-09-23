import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../src/lib/utils';
import { Tag } from './TagsTemplate';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface TableTemplateProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyField: keyof T;
  selectable?: boolean;
  selectedKeys?: (string | number)[];
  onSelectionChange?: (selected: (string | number)[]) => void;
  pageSize?: number;
  isDarkMode?: boolean;
  className?: string;
}

export function TableTemplate<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  pageSize = 10,
  isDarkMode = true,
  className,
}: TableTemplateProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const totalPages = Math.ceil(data.length / pageSize) || 1;

  const handleSort = (key: string) => {
    if (sortField === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(key);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal === bVal) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const res = aVal > bVal ? 1 : -1;
    return sortDirection === 'asc' ? res : -res;
  });

  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSelectAll = () => {
    if (selectedKeys.length === data.length) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(data.map((d) => d[keyField]));
    }
  };

  const toggleSelectRow = (key: string | number) => {
    if (selectedKeys.includes(key)) {
      onSelectionChange?.(selectedKeys.filter((k) => k !== key));
    } else {
      onSelectionChange?.([...selectedKeys, key]);
    }
  };

  return (
    <div className={cn('w-full rounded-2xl border shadow-xs overflow-hidden font-sans', isDarkMode ? 'border-neutral-800 bg-[#0C0F17]' : 'border-slate-200 bg-white', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className={cn('border-b select-none', isDarkMode ? 'border-neutral-800 bg-[#0F131D]/80 text-neutral-400' : 'border-slate-200 bg-slate-50 text-slate-600')}>
              {selectable && (
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedKeys.length === data.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={cn(
                    'py-3 px-4 font-semibold tracking-wider uppercase text-[11px]',
                    col.sortable && 'cursor-pointer hover:text-blue-500',
                    col.className
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && sortField === col.key && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-8 text-center text-slate-400">
                  No records available.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const rowKey = row[keyField];
                const isSelected = selectedKeys.includes(rowKey);

                return (
                  <tr
                    key={rowKey || idx}
                    className={cn(
                      'transition-colors',
                      isSelected
                        ? isDarkMode
                          ? 'bg-blue-600/10'
                          : 'bg-blue-50/60'
                        : isDarkMode
                        ? 'hover:bg-white/[0.02]'
                        : 'hover:bg-slate-50'
                    )}
                  >
                    {selectable && (
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(rowKey)}
                          className="rounded border-slate-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={cn('py-3 px-4', col.className)}>
                        {col.render ? col.render(row, idx) : (
                          Array.isArray(row[col.key]) ? (
                            <div className="flex flex-wrap gap-1">
                              {row[col.key].map((item: string, i: number) => (
                                <Tag key={i} size="sm" variant={item === 'Free' ? 'success' : item === 'Thinking' ? 'purple' : 'brand'}>
                                  {item}
                                </Tag>
                              ))}
                            </div>
                          ) : (
                            <span className={cn('truncate', isDarkMode ? 'text-neutral-200' : 'text-slate-800')}>
                              {String(row[col.key] ?? '')}
                            </span>
                          )
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className={cn('flex items-center justify-between px-4 py-3 border-t select-none text-xs', isDarkMode ? 'border-neutral-800 bg-[#0F131D]/40 text-neutral-400' : 'border-slate-200 bg-white text-slate-600')}>
        <p>
          Showing <span className="font-semibold text-slate-800 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-semibold text-slate-800 dark:text-white">{Math.min(currentPage * pageSize, data.length)}</span> of <span className="font-semibold text-slate-800 dark:text-white">{data.length}</span> models
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className="cursor-pointer px-2.5 py-1 rounded-lg border border-slate-200 dark:border-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-neutral-800 flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>
          <span className="px-2 font-medium">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            className="cursor-pointer px-2.5 py-1 rounded-lg border border-slate-200 dark:border-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-neutral-800 flex items-center gap-1 transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TableTemplate;
