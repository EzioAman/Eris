import * as React from 'react';

const AlertDialogContext = React.createContext<{
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}>({ open: false });

export interface AlertDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  if (!open) return null;

  return (
    <AlertDialogContext.Provider value={{ open, onOpenChange }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
          onClick={() => onOpenChange?.(false)}
          aria-hidden="true"
        />
        {/* Dialog Content */}
        <div className="relative z-50 w-full max-w-lg flex justify-center">
          {children}
        </div>
      </div>
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogContent({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`w-full max-w-md rounded-2xl border border-neutral-800 bg-[#0c0c0e]/95 p-6 shadow-2xl backdrop-blur-xl text-left ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function AlertDialogHeader({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`flex flex-col space-y-2 ${className}`}>{children}</div>;
}

export function AlertDialogTitle({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3 className={`text-xl font-semibold tracking-tight text-white ${className}`}>
      {children}
    </h3>
  );
}

export function AlertDialogDescription({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`text-sm sm:text-base text-neutral-400 leading-relaxed pt-1 ${className}`}>
      {children}
    </div>
  );
}

export function AlertDialogFooter({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-center justify-end gap-3 mt-6 ${className}`}>
      {children}
    </div>
  );
}

export function AlertDialogCancel({
  onClick,
  className = '',
  children = 'Cancel',
}: {
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const { onOpenChange } = React.useContext(AlertDialogContext);
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        onOpenChange?.(false);
      }}
      className={`py-2 px-4 rounded-xl border border-neutral-700 hover:border-neutral-600 bg-transparent hover:bg-neutral-800/60 text-sm font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}

export function AlertDialogAction({
  onClick,
  className = '',
  children,
}: {
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const { onOpenChange } = React.useContext(AlertDialogContext);
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        onOpenChange?.(false);
      }}
      className={`py-2 px-5 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 text-sm font-semibold transition-colors cursor-pointer shadow-md ${className}`}
    >
      {children}
    </button>
  );
}
