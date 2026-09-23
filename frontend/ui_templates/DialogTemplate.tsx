import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../src/lib/utils';

export interface DialogTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const DialogTemplate: React.FC<DialogTemplateProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative z-50 w-full max-w-lg rounded-2xl border border-neutral-800 bg-[#0c0c0e]/95 p-6 shadow-2xl backdrop-blur-xl text-left',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm text-neutral-400 opacity-70 hover:opacity-100 cursor-pointer"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {(title || description) && (
          <div className="flex flex-col space-y-1.5 pb-4">
            {title && (
              <h2 className="text-lg font-semibold tracking-tight text-white">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-neutral-400">{description}</p>
            )}
          </div>
        )}

        <div className="py-2">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 pt-4 mt-2 border-t border-neutral-850">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
