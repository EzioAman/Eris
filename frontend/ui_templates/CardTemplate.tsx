import React from 'react';
import { cn } from '../src/lib/utils';

export interface CardTemplateProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  headerAction?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const CardTemplate: React.FC<CardTemplateProps> = ({
  title,
  description,
  badge,
  headerAction,
  children,
  footer,
  className,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'w-full max-w-md rounded-2xl border border-neutral-800 bg-[#0c0c0e]/95 p-6 shadow-2xl backdrop-blur-xl text-left transition-all',
        className
      )}
    >
      {(title || description || badge || headerAction) && (
        <div className="flex flex-col space-y-1.5 pb-4">
          <div className="flex items-center justify-between gap-2">
            {title && (
              <h3 className="text-xl font-semibold tracking-tight text-white">
                {title}
              </h3>
            )}
            <div className="flex items-center gap-2">
              {badge}
              {headerAction}
            </div>
          </div>
          {description && (
            <p className="text-sm text-neutral-400 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}

      {children && <div className="py-1">{children}</div>}

      {footer && (
        <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-neutral-850">
          {footer}
        </div>
      )}
    </div>
  );
};

export default CardTemplate;
