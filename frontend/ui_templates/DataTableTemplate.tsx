import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  X,
  Check,
} from 'lucide-react';
import { cn } from '../src/lib/utils';

export interface DataTableColumn<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  sortable?: boolean;
  hideable?: boolean;
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface FacetedFilterOption {
  label: string;
  value: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface FacetedFilter {
  id: string;
  title: string;
  options: FacetedFilterOption[];
  filterFn?: (row: any, selectedValues: string[]) => boolean;
}

export interface DataTableTemplateProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyField: keyof T;
  searchPlaceholder?: string;
  searchKey?: keyof T | ((row: T) => string);
  facetedFilters?: FacetedFilter[];
  selectable?: boolean;
  selectedKeys?: (string | number)[];
  onSelectionChange?: (keys: (string | number)[]) => void;
  onFilterChange?: (filters: Record<string, string[]>) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  isDarkMode?: boolean;
  emptyMessage?: string;
  className?: string;
  extraToolbarActions?: React.ReactNode;
}

export function DataTableTemplate<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  searchPlaceholder = 'Filter records...',
  searchKey,
  facetedFilters = [],
  selectable = true,
  selectedKeys = [],
  onSelectionChange,
  onFilterChange,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 20, 50],
  isDarkMode = true,
  emptyMessage = 'No matching records found.',
  className,
  extraToolbarActions,
}: DataTableTemplateProps<T>) {
  // 1. Search Query State
  const [searchQuery, setSearchQuery] = useState('');

  // 2. Active Faceted Filter Selections: Record<filterId, Set<value>>
  const [filterSelections, setFilterSelections] = useState<Record<string, string[]>>({});
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);

  // 3. Column Visibility State
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string>>(
    () => new Set(columns.map((c) => c.id))
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // 4. Sorting State
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 5. Pagination State
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  // Toggle filter value
  const handleToggleFilter = (filterId: string, value: string) => {
    setFilterSelections((prev) => {
      const current = prev[filterId] || [];
      const nextArr = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      const updated = { ...prev, [filterId]: nextArr };
      onFilterChange?.(updated);
      return updated;
    });
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterSelections({});
    onFilterChange?.({});
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    Object.values(filterSelections).some((arr) => arr.length > 0);

  // Filter Data
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        let match = false;
        if (typeof searchKey === 'function') {
          match = searchKey(row).toLowerCase().includes(query);
        } else if (searchKey && row[searchKey] != null) {
          match = String(row[searchKey]).toLowerCase().includes(query);
        } else {
          // Default search across all primitive values
          match = Object.values(row).some((val) =>
            typeof val === 'string' || typeof val === 'number'
              ? String(val).toLowerCase().includes(query)
              : false
          );
        }
        if (!match) return false;
      }

      // Faceted filters
      for (const filter of facetedFilters) {
        const selected = filterSelections[filter.id];
        if (selected && selected.length > 0) {
          if (filter.filterFn) {
            if (!filter.filterFn(row, selected)) return false;
          } else {
            const rowVal = String(row[filter.id] ?? '');
            if (!selected.includes(rowVal)) return false;
          }
        }
      }

      return true;
    });
  }, [data, searchQuery, searchKey, facetedFilters, filterSelections]);

  // Sort Data
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;
    return [...filteredData].sort((a, b) => {
      const col = columns.find((c) => c.id === sortField);
      const aVal = col?.accessorKey ? a[col.accessorKey] : a[sortField];
      const bVal = col?.accessorKey ? b[col.accessorKey] : b[sortField];

      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const cmp = aVal > bVal ? 1 : -1;
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortField, sortDirection, columns]);

  // Paginate Data
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const clampedPage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedData = useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, clampedPage, pageSize]);

  // Selection handlers
  const toggleSelectAllCurrent = () => {
    if (paginatedData.length === 0) return;
    const currentKeys = paginatedData.map((d) => d[keyField] as unknown as string | number);
    const allSelected = currentKeys.every((k) => selectedKeys.includes(k));

    if (allSelected) {
      onSelectionChange?.(selectedKeys.filter((k) => !currentKeys.includes(k)));
    } else {
      const merged = Array.from(new Set([...selectedKeys, ...currentKeys]));
      onSelectionChange?.(merged);
    }
  };

  const toggleSelectRow = (key: string | number) => {
    if (selectedKeys.includes(key)) {
      onSelectionChange?.(selectedKeys.filter((k) => k !== key));
    } else {
      onSelectionChange?.([...selectedKeys, key]);
    }
  };

  const handleSort = (colId: string) => {
    if (sortField === colId) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(colId);
      setSortDirection('asc');
    }
  };

  const visibleColumns = columns.filter((c) => visibleColumnIds.has(c.id));

  return (
    <div
      className={cn(
        'w-full flex flex-col rounded-2xl border shadow-lg font-sans overflow-hidden transition-colors select-none',
        isDarkMode
          ? 'bg-[#0B0F17] border-white/10 text-white shadow-black/60'
          : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50',
        className
      )}
    >
      {/* ─── 1. Header Toolbar (ReactBits Pro data-table-1) ─── */}
      <div
        className={cn(
          'p-3.5 sm:p-4 border-b flex flex-wrap items-center justify-between gap-3',
          isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/70'
        )}
      >
        {/* Left Side: Search + Faceted Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          {/* Search Input */}
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className={cn(
                'w-full pl-8 pr-7 py-1.5 rounded-xl text-xs font-sans outline-none border transition-colors',
                isDarkMode
                  ? 'bg-black/50 border-white/10 text-white placeholder-neutral-500 focus:border-cyan-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
              )}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={cn(
                  'absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer',
                  isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                )}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Faceted Filter Buttons */}
          {facetedFilters.map((filter) => {
            const selected = filterSelections[filter.id] || [];
            const isOpen = openFilterDropdown === filter.id;

            return (
              <div key={filter.id} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenFilterDropdown(isOpen ? null : filter.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer',
                    selected.length > 0
                      ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                      : isDarkMode
                      ? 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <span>{filter.title}</span>
                  {selected.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-500/30 text-indigo-200">
                      {selected.length}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {/* Filter Dropdown Popover */}
                {isOpen && (
                  <div
                    className={cn(
                      'absolute left-0 top-full mt-1.5 z-40 w-48 rounded-2xl p-1.5 border shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150',
                      isDarkMode
                        ? 'bg-[#0E1320] border-white/10 text-neutral-200'
                        : 'bg-white border-slate-200 text-slate-800'
                    )}
                  >
                    <div className="text-[11px] font-semibold px-2 py-1 text-neutral-400 uppercase tracking-wider">
                      {filter.title}
                    </div>
                    <div className="space-y-0.5 max-h-52 overflow-y-auto no-scrollbar">
                      {filter.options.map((opt) => {
                        const isChecked = selected.includes(opt.value);
                        const Icon = opt.icon;

                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleToggleFilter(filter.id, opt.value)}
                            className={cn(
                              'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left',
                              isChecked
                                ? isDarkMode
                                  ? 'bg-indigo-600/20 text-indigo-300'
                                  : 'bg-blue-50 text-blue-700'
                                : isDarkMode
                                ? 'hover:bg-white/5'
                                : 'hover:bg-slate-100'
                            )}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div
                                className={cn(
                                  'size-3.5 rounded border flex items-center justify-center shrink-0 transition-colors',
                                  isChecked
                                    ? 'bg-indigo-600 border-indigo-500 text-white'
                                    : 'border-neutral-500/50 bg-transparent'
                                )}
                              >
                                {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                              {Icon && <Icon className="w-3 h-3 text-neutral-400" />}
                              <span className="truncate">{opt.label}</span>
                            </div>
                            {typeof opt.count === 'number' && (
                              <span className="text-[10px] font-mono opacity-50 ml-1">
                                {opt.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className={cn(
                'inline-flex items-center gap-1 text-xs px-2 py-1 transition-colors cursor-pointer',
                isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right Side: Column Visibility & Actions */}
        <div className="flex items-center gap-2">
          {extraToolbarActions}

          {/* View / Column Visibility Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer',
                isDarkMode
                  ? 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400" />
              <span>View</span>
            </button>

            {showColumnMenu && (
              <div
                className={cn(
                  'absolute right-0 top-full mt-1.5 z-40 w-44 rounded-2xl p-1.5 border shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150',
                  isDarkMode
                    ? 'bg-[#0E1320] border-white/10 text-neutral-200'
                    : 'bg-white border-slate-200 text-slate-800'
                )}
              >
                <div className="text-[11px] font-semibold px-2 py-1 text-neutral-400 uppercase tracking-wider">
                  Toggle Columns
                </div>
                <div className="space-y-0.5 max-h-56 overflow-y-auto no-scrollbar">
                  {columns
                    .filter((c) => c.hideable !== false)
                    .map((col) => {
                      const isVis = visibleColumnIds.has(col.id);
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => {
                            setVisibleColumnIds((prev) => {
                              const next = new Set(prev);
                              if (isVis && next.size > 1) next.delete(col.id);
                              else next.add(col.id);
                              return next;
                            });
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left',
                            isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                          )}
                        >
                          <div
                            className={cn(
                              'size-3.5 rounded border flex items-center justify-center shrink-0 transition-colors',
                              isVis
                                ? 'bg-cyan-600 border-cyan-500 text-white'
                                : 'border-neutral-500/50 bg-transparent'
                            )}
                          >
                            {isVis && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className="truncate">{col.header}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. Data Table Canvas ─── */}
      <div className="overflow-x-auto min-h-[160px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr
              className={cn(
                'border-b',
                isDarkMode
                  ? 'border-white/10 bg-[#080C14] text-neutral-400'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              )}
            >
              {selectable && (
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      paginatedData.length > 0 &&
                      paginatedData.every((d) => selectedKeys.includes(d[keyField]))
                    }
                    onChange={toggleSelectAllCurrent}
                    className="rounded border-slate-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
              )}

              {visibleColumns.map((col) => (
                <th
                  key={col.id}
                  onClick={() => col.sortable && handleSort(col.id)}
                  className={cn(
                    'py-3 px-4 font-semibold text-xs transition-colors',
                    col.sortable
                      ? isDarkMode
                        ? 'cursor-pointer hover:text-white select-none'
                        : 'cursor-pointer hover:text-slate-900 select-none'
                      : '',
                    col.className
                  )}
                >
                  <div className="inline-flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-neutral-500">
                        {sortField === col.id ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody
            className={cn(
              'divide-y',
              isDarkMode ? 'divide-white/5' : 'divide-slate-200/80'
            )}
          >
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => {
                const rowKey = row[keyField];
                const isSelected = selectedKeys.includes(rowKey);

                return (
                  <tr
                    key={String(rowKey)}
                    className={cn(
                      'transition-colors group',
                      isSelected
                        ? isDarkMode
                          ? 'bg-blue-950/20 text-white'
                          : 'bg-blue-50/70 text-slate-900'
                        : isDarkMode
                        ? 'hover:bg-white/[0.03]'
                        : 'hover:bg-slate-50/80'
                    )}
                  >
                    {selectable && (
                      <td className="py-3.5 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(rowKey)}
                          className="rounded border-slate-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                    )}

                    {visibleColumns.map((col) => (
                      <td key={col.id} className={cn('py-3.5 px-4 sm:px-5 align-middle', col.className)}>
                        {col.render
                          ? col.render(row, idx)
                          : col.accessorKey
                          ? String(row[col.accessorKey] ?? '—')
                          : String(row[col.id] ?? '—')}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                  className="py-12 text-center text-xs text-neutral-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 3. Pagination Footer (ReactBits Pro data-table-1) ─── */}
      <div
        className={cn(
          'p-3 sm:p-3.5 border-t flex flex-wrap items-center justify-between gap-3 text-xs',
          isDarkMode ? 'border-white/10 bg-white/[0.01]' : 'border-slate-200 bg-slate-50/50'
        )}
      >
        {/* Selected Count */}
        <div className={cn('text-[11px]', isDarkMode ? 'text-neutral-400' : 'text-slate-500')}>
          {selectable && (
            <span>
              <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>
                {selectedKeys.length}
              </strong>{' '}
              of {sortedData.length} row(s) selected
            </span>
          )}
        </div>

        {/* Page navigation controls */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Page size select */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-500'}>
              Rows per page
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={cn(
                'rounded-lg px-2 py-1 text-xs outline-none border transition-colors cursor-pointer',
                isDarkMode
                  ? 'bg-[#0E1320] border-white/10 text-white'
                  : 'bg-white border-slate-200 text-slate-800'
              )}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Page Indicator */}
          <span className={cn('text-[11px]', isDarkMode ? 'text-neutral-400' : 'text-slate-500')}>
            Page <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{clampedPage}</strong> of{' '}
            <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{totalPages}</strong>
          </span>

          {/* Pagination Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={clampedPage <= 1}
              onClick={() => setCurrentPage(1)}
              className={cn(
                'p-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed',
                isDarkMode
                  ? 'border-white/10 hover:bg-white/5 text-neutral-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              )}
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={clampedPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={cn(
                'p-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed',
                isDarkMode
                  ? 'border-white/10 hover:bg-white/5 text-neutral-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              )}
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={clampedPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={cn(
                'p-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed',
                isDarkMode
                  ? 'border-white/10 hover:bg-white/5 text-neutral-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              )}
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={clampedPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className={cn(
                'p-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed',
                isDarkMode
                  ? 'border-white/10 hover:bg-white/5 text-neutral-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              )}
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataTableTemplate;
