import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../src/lib/utils';

export type TagVariant = 'gray' | 'brand' | 'success' | 'warning' | 'error' | 'purple';
export type TagSize = 'sm' | 'md';

export interface TagProps {
  children: React.ReactNode;
  variant?: TagVariant;
  size?: TagSize;
  dot?: boolean;
  icon?: React.ReactNode;
  onRemove?: () => void;
  className?: string;
}

const variantStyles: Record<TagVariant, { bg: string; text: string; dot: string; border: string }> = {
  gray: {
    bg: 'bg-slate-100 dark:bg-white/10',
    text: 'text-slate-700 dark:text-neutral-300',
    dot: 'bg-slate-500',
    border: 'border-slate-200 dark:border-white/10',
  },
  brand: {
    bg: 'bg-blue-50 dark:bg-blue-500/15',
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-600 dark:bg-blue-400',
    border: 'border-blue-200 dark:border-blue-500/30',
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-500/30',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-500/15',
    text: 'text-amber-800 dark:text-amber-300',
    dot: 'bg-amber-600 dark:bg-amber-400',
    border: 'border-amber-200 dark:border-amber-500/30',
  },
  error: {
    bg: 'bg-rose-50 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-600 dark:bg-rose-400',
    border: 'border-rose-200 dark:border-rose-500/30',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-500/15',
    text: 'text-purple-700 dark:text-purple-300',
    dot: 'bg-purple-600 dark:bg-purple-400',
    border: 'border-purple-200 dark:border-purple-500/30',
  },
};

export const Tag: React.FC<TagProps> = ({
  children,
  variant = 'gray',
  size = 'md',
  dot = false,
  icon,
  onRemove,
  className,
}) => {
  const styles = variantStyles[variant] || variantStyles.gray;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border rounded-md transition-colors select-none font-sans',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        styles.bg,
        styles.text,
        styles.border,
        className
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full shrink-0', styles.dot)} />}
      {icon && <span className="size-3.5 flex items-center justify-center shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer text-current opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

export default Tag;
