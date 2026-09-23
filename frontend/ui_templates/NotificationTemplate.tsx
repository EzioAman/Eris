import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../src/lib/utils';

export type NotificationVariant = 'info' | 'success' | 'warning' | 'error';

export interface NotificationTemplateProps {
  title: string;
  description?: string;
  variant?: NotificationVariant;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  isDarkMode?: boolean;
  className?: string;
}

const variantConfig: Record<NotificationVariant, { icon: React.ReactNode; border: string; bg: string; iconColor: string }> = {
  info: {
    icon: <Info className="w-4 h-4" />,
    border: 'border-blue-500/30',
    bg: 'bg-blue-50/90 dark:bg-blue-950/40',
    iconColor: 'text-blue-500',
  },
  success: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-50/90 dark:bg-emerald-950/40',
    iconColor: 'text-emerald-500',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    border: 'border-amber-500/30',
    bg: 'bg-amber-50/90 dark:bg-amber-950/40',
    iconColor: 'text-amber-500',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" />,
    border: 'border-rose-500/30',
    bg: 'bg-rose-50/90 dark:bg-rose-950/40',
    iconColor: 'text-rose-500',
  },
};

export const NotificationTemplate: React.FC<NotificationTemplateProps> = ({
  title,
  description,
  variant = 'info',
  actionLabel,
  onAction,
  onDismiss,
  isDarkMode = true,
  className,
}) => {
  const conf = variantConfig[variant] || variantConfig.info;

  return (
    <div
      className={cn(
        'w-full max-w-sm rounded-xl border p-3.5 shadow-lg backdrop-blur-md transition-all font-sans flex items-start gap-3',
        conf.bg,
        conf.border,
        isDarkMode ? 'text-white' : 'text-slate-900',
        className
      )}
    >
      <div className={cn('shrink-0 mt-0.5', conf.iconColor)}>{conf.icon}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-semibold leading-tight">{title}</h4>
        {description && (
          <p className={cn('text-xs mt-1 leading-relaxed', isDarkMode ? 'text-neutral-300' : 'text-slate-600')}>
            {description}
          </p>
        )}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="cursor-pointer mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            {actionLabel}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default NotificationTemplate;
