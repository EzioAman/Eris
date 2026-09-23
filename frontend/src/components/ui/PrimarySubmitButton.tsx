import * as React from 'react';

export interface PrimarySubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
}

/**
 * A reusable gradient submit button extracted from the repeated pattern
 * across all onboarding step forms. Uses the ERIS violet → indigo → sky gradient.
 */
export const PrimarySubmitButton = React.forwardRef<HTMLButtonElement, PrimarySubmitButtonProps>(
  ({ className = '', children, isLoading = false, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="submit"
        disabled={disabled || isLoading}
        className={`
          w-full py-3 px-5 rounded-xl
          bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-500
          hover:brightness-110 active:brightness-95 active:scale-[0.98]
          text-white font-medium text-sm tracking-wide
          transition-all duration-200
          shadow-lg shadow-violet-600/25
          cursor-pointer border border-white/10
          disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed
          select-none
          ${className}
        `.trim()}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Processing…</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
PrimarySubmitButton.displayName = 'PrimarySubmitButton';
