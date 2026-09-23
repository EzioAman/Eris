import * as React from 'react';
import { cn } from '../../lib/utils';

interface HoverCardContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const HoverCardContext = React.createContext<HoverCardContextValue | null>(null);

export interface HoverCardProps {
  openDelay?: number;
  closeDelay?: number;
  children: React.ReactNode;
}

export function HoverCard({
  openDelay = 150,
  closeDelay = 200,
  children,
}: HoverCardProps) {
  const [open, setOpen] = React.useState(false);
  const openTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpen = React.useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    openTimeoutRef.current = setTimeout(() => setOpen(true), openDelay);
  }, [openDelay]);

  const handleClose = React.useCallback(() => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => setOpen(false), closeDelay);
  }, [closeDelay]);

  return (
    <HoverCardContext.Provider value={{ open, setOpen }}>
      <div
        className="relative inline-block"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        {children}
      </div>
    </HoverCardContext.Provider>
  );
}

export interface HoverCardTriggerProps extends React.HTMLAttributes<HTMLSpanElement> {
  asChild?: boolean;
}

export const HoverCardTrigger = React.forwardRef<HTMLSpanElement, HoverCardTriggerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn('inline-flex items-center cursor-pointer', className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);
HoverCardTrigger.displayName = 'HoverCardTrigger';

export interface HoverCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
}

export const HoverCardContent = React.forwardRef<HTMLDivElement, HoverCardContentProps>(
  ({ className, align = 'center', children, ...props }, ref) => {
    const context = React.useContext(HoverCardContext);
    if (!context?.open) return null;

    let alignClass = '-translate-x-1/2 left-1/2';
    if (align === 'start') alignClass = 'left-0';
    if (align === 'end') alignClass = 'right-0';

    return (
      <div
        ref={ref}
        className={cn(
          'absolute bottom-full mb-2 z-50 w-72 sm:w-80 rounded-xl border border-neutral-800 bg-[#0c0c0e]/95 p-4 shadow-2xl backdrop-blur-xl text-neutral-200 animate-in fade-in zoom-in-95 duration-150',
          alignClass,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
HoverCardContent.displayName = 'HoverCardContent';
