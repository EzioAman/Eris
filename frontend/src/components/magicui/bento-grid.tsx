import React from 'react';
import { cn } from '../../lib/utils';
import { BadgeTemplate } from '../../../ui_templates/BadgeTemplate';

/* ──────────────────────────────────────────────────────────
   BentoGrid — MagicUI Container
   ────────────────────────────────────────────────────────── */

export interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const BentoGrid: React.FC<BentoGridProps> = ({
  children,
  className,
  ...props
}) => (
  <div
    className={cn(
      'grid w-full gap-4 transition-all duration-300',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

/* ──────────────────────────────────────────────────────────
   BentoCard — MagicUI + Jebbles Layered Animation Card
   ────────────────────────────────────────────────────────── */

export type BentoCardStatus = 'pending' | 'checking' | 'ok' | 'fail';

export interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  description?: string;
  Icon?: React.ElementType;
  status?: BentoCardStatus;
  statusText?: string;
  colSpan?: number;
  rowSpan?: number;
  isCenter?: boolean;
  expandable?: boolean;
  onExpand?: () => void;
  nodeRef?: React.Ref<HTMLDivElement>;
}

const statusConfig: Record<
  BentoCardStatus,
  {
    dot: string;
    glow: string;
    label: string;
    variant: 'outline' | 'secondary' | 'success' | 'destructive';
    extraClass: string;
  }
> = {
  pending: {
    dot: 'bg-neutral-400',
    glow: '',
    label: 'Pending',
    variant: 'outline',
    extraClass: 'border-white/10 text-neutral-400 bg-white/5',
  },
  checking: {
    dot: 'bg-amber-400 animate-pulse',
    glow: 'shadow-[0_0_10px_rgba(245,158,11,0.6)]',
    label: 'Probing...',
    variant: 'secondary',
    extraClass: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
  },
  ok: {
    dot: 'bg-emerald-400',
    glow: 'shadow-[0_0_10px_rgba(16,185,129,0.7)]',
    label: 'Online',
    variant: 'success',
    extraClass: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
  },
  fail: {
    dot: 'bg-rose-500',
    glow: 'shadow-[0_0_10px_rgba(244,63,94,0.7)]',
    label: 'Failed',
    variant: 'destructive',
    extraClass: 'border-rose-500/30 text-rose-300 bg-rose-500/10',
  },
};

export const BentoCard: React.FC<BentoCardProps> = ({
  name,
  description,
  Icon,
  status = 'pending',
  statusText,
  colSpan,
  rowSpan,
  isCenter = false,
  expandable = true,
  onExpand,
  nodeRef,
  className,
  children,
  ...props
}) => {
  const cfg = statusConfig[status];
  const spanStyle: React.CSSProperties = {
    gridColumn: colSpan ? `span ${colSpan}` : undefined,
    gridRow: rowSpan ? `span ${rowSpan}` : undefined,
  };

  /* Completely open/empty center */
  if (isCenter) {
    return (
      <div
        ref={nodeRef}
        className={cn('relative pointer-events-none', className)}
        style={spanStyle}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={nodeRef}
      role={expandable ? 'button' : undefined}
      tabIndex={expandable ? 0 : undefined}
      onClick={expandable ? onExpand : undefined}
      onKeyDown={
        expandable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onExpand?.();
              }
            }
          : undefined
      }
      className={cn(
        // Jebbles layered depth + MagicUI dark styling
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl',
        'border border-white/10 bg-neutral-950/80 backdrop-blur-md',
        'p-5 transition-all duration-300 ease-out',
        'hover:-translate-y-1.5 hover:border-white/20 hover:bg-neutral-900/90 hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.8)]',
        expandable && 'cursor-pointer active:scale-[0.98]',
        status === 'ok' && 'hover:border-emerald-500/40 hover:shadow-[0_0_24px_rgba(16,185,129,0.15)]',
        status === 'fail' && 'border-rose-500/30 hover:border-rose-500/50',
        className
      )}
      style={spanStyle}
      {...props}
    >
      {/* Top Header: Floating Icon & Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          {Icon && (
            <div
              className={cn(
                'flex items-center justify-center size-11 rounded-xl border transition-all duration-300',
                'shadow-md group-hover:scale-110',
                status === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : status === 'fail'
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                  : status === 'checking'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  : 'border-white/10 bg-white/5 text-neutral-400'
              )}
            >
              <Icon className="size-5 transition-transform duration-300 group-hover:scale-105" />
            </div>
          )}

          <div className="flex flex-col text-left">
            <h3 className="text-base font-semibold text-white tracking-tight group-hover:text-white transition-colors font-sans">
              {name}
            </h3>
            {description && (
              <p className="text-xs text-neutral-400 font-normal leading-relaxed mt-0.5 font-sans">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Status indicator badge using BadgeTemplate */}
        <BadgeTemplate
          variant={cfg.variant}
          className={cn(
            'flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-sans font-medium shrink-0',
            cfg.extraClass
          )}
        >
          <span className={cn('size-2 rounded-full', cfg.dot, cfg.glow)} />
          <span>{statusText || cfg.label}</span>
        </BadgeTemplate>
      </div>

      {/* Children or custom elements */}
      {children && <div className="mt-3 flex-1">{children}</div>}

      {/* Subtle specular sheen on hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-white/[0.03] to-transparent" />
    </div>
  );
};

export default BentoGrid;
